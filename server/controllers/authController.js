// // authController.js

const bcrypt = require('bcryptjs');
const { createHash, randomUUID, timingSafeEqual } = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Client = require('../models/client');
const Lawyer = require('../models/lawyer');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const MAX_REFRESH_SESSIONS = 10;

function signAccessToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL, jwtid: randomUUID() }
  );
}

function digestRefreshToken(refreshToken) {
  return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
}

function refreshTokenMatchesDigest(refreshToken, storedDigest) {
  if (typeof storedDigest !== 'string' || !/^[a-f0-9]{64}$/i.test(storedDigest)) {
    // Legacy bcrypt values are deliberately invalidated. Bcrypt truncates
    // inputs after 72 bytes, which makes distinct JWTs with a shared prefix
    // compare equal and therefore cannot safely identify refresh sessions.
    return false;
  }

  const presented = Buffer.from(digestRefreshToken(refreshToken), 'hex');
  const stored = Buffer.from(storedDigest, 'hex');
  return timingSafeEqual(presented, stored);
}

async function addRefreshSession(user, refreshToken, device) {
  const tokenHash = digestRefreshToken(refreshToken);
  const result = await User.updateOne(
    { _id: user._id, isActive: true },
    {
      $set: { lastLogin: new Date() },
      $push: {
        refreshTokens: {
          $each: [{ tokenHash, device: device || 'unknown', createdAt: new Date() }],
          $slice: -MAX_REFRESH_SESSIONS,
        },
      },
    }
  );
  if (result.modifiedCount !== 1) throw new Error('Could not persist refresh session.');
}

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!["client", "lawyer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(409).json({ message: "Email or phone already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, phone, passwordHash, role });

    if (role === "client") {
      await Client.create({ userId: user._id });
    } else {
      await Lawyer.create({
        userId: user._id,
        specialization: [],
        yearsOfExperience: 0,
        consultationFee: 0,
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // CHANGED: schema is `refreshTokens: [ { tokenHash, device, createdAt } ]`,
    // not a single `refreshToken` string. Push a new session entry instead
    // of overwriting a field that doesn't exist on the model.
    await addRefreshSession(user, refreshToken, req.headers['user-agent']);

    return res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed.", error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await addRefreshSession(user, refreshToken, req.headers['user-agent']);

    return res.status(200).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed.", error: err.message });
  }
};

// POST /api/auth/refresh-token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token." });
    }

    const user = await User.findById(payload.userId).select("+refreshTokens.tokenHash");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User no longer active." });
    }

    const oldTokenHash = digestRefreshToken(refreshToken);
    const hasMatchingSession = user.refreshTokens.some((session) => (
      refreshTokenMatchesDigest(refreshToken, session.tokenHash)
    ));

    if (!hasMatchingSession) {
      return res.status(401).json({ message: "Refresh token revoked or invalid." });
    }

    // Rotate: swap in a new refresh token for this same session so a
    // captured/replayed old token stops working after this call.
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    const newTokenHash = digestRefreshToken(newRefreshToken);
    const rotation = await User.updateOne(
      {
        _id: user._id,
        isActive: true,
        'refreshTokens.tokenHash': oldTokenHash,
      },
      { $set: { 'refreshTokens.$[session].tokenHash': newTokenHash } },
      { arrayFilters: [{ 'session.tokenHash': oldTokenHash }] }
    );
    if (rotation.modifiedCount !== 1) {
      return res.status(401).json({ message: 'Refresh token was already used or revoked.' });
    }

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(500).json({ message: "Could not refresh token.", error: err.message });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      // Already invalid/expired — nothing to revoke, but don't error the
      // logout flow over it.
      return res.status(200).json({ message: "Logged out successfully." });
    }

    // The deterministic digest identifies exactly this token. Legacy bcrypt
    // entries never match and are therefore already invalidated.
    await User.updateOne(
      { _id: payload.userId },
      { $pull: { refreshTokens: { tokenHash: digestRefreshToken(refreshToken) } } }
    );

    return res.status(200).json({ message: "Logged out successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Logout failed.", error: err.message });
  }
};













// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../models/user');
// const Client = require('../models/client');
// const Lawyer = require('../models/lawyer');

// const ACCESS_TOKEN_TTL = '15m';
// const REFRESH_TOKEN_TTL = '30d';

// function signAccessToken(user) {
//   return jwt.sign(
//     { userId: user._id, role: user.role },
//     process.env.JWT_ACCESS_SECRET,
//     { expiresIn: ACCESS_TOKEN_TTL }
//   );
// }

// function signRefreshToken(user) {
//   return jwt.sign(
//     { userId: user._id },
//     process.env.JWT_REFRESH_SECRET,
//     { expiresIn: REFRESH_TOKEN_TTL }
//   );
// }

// // POST /api/auth/register
// // Creates User + the matching role profile (Client or Lawyer) in one call
// // so the frontend never has to make two requests to finish signup.
// exports.register = async (req, res) => {
//     try {
//       const { name, email, phone, password, role } = req.body;
  
//       if (!name || !email || !phone || !password || !role) {
//         return res.status(400).json({
//           message: "Missing required fields.",
//         });
//       }
  
//       if (!["client", "lawyer"].includes(role)) {
//         return res.status(400).json({
//           message: "Invalid role.",
//         });
//       }
  
//       const existing = await User.findOne({
//         $or: [{ email }, { phone }],
//       });
  
//       if (existing) {
//         return res.status(409).json({
//           message: "Email or phone already registered.",
//         });
//       }
  
//       const passwordHash = await bcrypt.hash(password, 12);
  
//       const user = await User.create({
//         name,
//         email,
//         phone,
//         passwordHash,
//         role,
//       });
  
//       if (role === "client") {
//         await Client.create({
//           userId: user._id,
//         });
//       } else {
//         await Lawyer.create({
//           userId: user._id,
//           specialization: [],
//           yearsOfExperience: 0,
//           consultationFee: 0,
//         });
//       }
  
//       const accessToken = signAccessToken(user);
//       const refreshToken = signRefreshToken(user);
  
//       user.refreshToken = await bcrypt.hash(refreshToken, 12);
//       await user.save();
  
//       return res.status(201).json({
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//         },
//         accessToken,
//         refreshToken,
//       });
//     } catch (err) {
//       return res.status(500).json({
//         message: "Registration failed.",
//         error: err.message,
//       });
//     }
//   };



//   exports.login = async (req, res) => {
//     try {
//       const { email, password } = req.body;
  
//       if (!email || !password) {
//         return res.status(400).json({
//           message: "Email and password are required.",
//         });
//       }
  
//       const user = await User.findOne({ email }).select(
//         "+passwordHash +refreshToken"
//       );
  
//       if (!user || !user.isActive) {
//         return res.status(401).json({
//           message: "Invalid credentials.",
//         });
//       }
  
//       const isMatch = await bcrypt.compare(
//         password,
//         user.passwordHash
//       );
  
//       if (!isMatch) {
//         return res.status(401).json({
//           message: "Invalid credentials.",
//         });
//       }
  
//       user.lastLogin = new Date();
  
//       const accessToken = signAccessToken(user);
//       const refreshToken = signRefreshToken(user);
  
//       user.refreshToken = await bcrypt.hash(refreshToken, 12);
  
//       await user.save();
  
//       return res.status(200).json({
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//         },
//         accessToken,
//         refreshToken,
//       });
//     } catch (err) {
//       return res.status(500).json({
//         message: "Login failed.",
//         error: err.message,
//       });
//     }
//   };

  
//   exports.refreshToken = async (req, res) => {
//     try {
//       const { refreshToken } = req.body;
  
//       if (!refreshToken) {
//         return res.status(400).json({
//           message: "Refresh token is required.",
//         });
//       }
  
//       let payload;
  
//       try {
//         payload = jwt.verify(
//           refreshToken,
//           process.env.JWT_REFRESH_SECRET
//         );
//       } catch {
//         return res.status(401).json({
//           message: "Invalid or expired refresh token.",
//         });
//       }
  
//       const user = await User.findById(payload.userId).select(
//         "+refreshToken"
//       );
  
//       if (!user || !user.isActive) {
//         return res.status(401).json({
//           message: "User no longer active.",
//         });
//       }
  
//       if (!user.refreshToken) {
//         return res.status(401).json({
//           message: "Refresh token revoked.",
//         });
//       }
  
//       const valid = await bcrypt.compare(
//         refreshToken,
//         user.refreshToken
//       );
  
//       if (!valid) {
//         return res.status(401).json({
//           message: "Invalid refresh token.",
//         });
//       }
  
//       const newAccessToken = signAccessToken(user);
  
//       return res.status(200).json({
//         accessToken: newAccessToken,
//       });
//     } catch (err) {
//       return res.status(500).json({
//         message: "Could not refresh token.",
//         error: err.message,
//       });
//     }
//   };



//   exports.logout = async (req, res) => {
//     try {
//       const { refreshToken } = req.body;
  
//       if (!refreshToken) {
//         return res.status(400).json({
//           message: "Refresh token is required.",
//         });
//       }
  
//       let payload;
  
//       try {
//         payload = jwt.verify(
//           refreshToken,
//           process.env.JWT_REFRESH_SECRET
//         );
//       } catch {
//         return res.status(401).json({
//           message: "Invalid refresh token.",
//         });
//       }
  
//       const user = await User.findById(payload.userId).select(
//         "+refreshToken"
//       );
  
//       if (user) {
//         user.refreshToken = null;
//         await user.save();
//       }
  
//       return res.status(200).json({
//         message: "Logged out successfully.",
//       });
//     } catch (err) {
//       return res.status(500).json({
//         message: "Logout failed.",
//         error: err.message,
//       });
//     }
//   };
// authController.js
