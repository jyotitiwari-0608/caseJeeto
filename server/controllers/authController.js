const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Client = require('../models/client');
const Lawyer = require('../models/lawyer');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

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
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

// POST /api/auth/register
// Creates User + the matching role profile (Client or Lawyer) in one call
// so the frontend never has to make two requests to finish signup.
exports.register = async (req, res) => {
    try {
      const { name, email, phone, password, role } = req.body;
  
      if (!name || !email || !phone || !password || !role) {
        return res.status(400).json({
          message: "Missing required fields.",
        });
      }
  
      if (!["client", "lawyer"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role.",
        });
      }
  
      const existing = await User.findOne({
        $or: [{ email }, { phone }],
      });
  
      if (existing) {
        return res.status(409).json({
          message: "Email or phone already registered.",
        });
      }
  
      const passwordHash = await bcrypt.hash(password, 12);
  
      const user = await User.create({
        name,
        email,
        phone,
        passwordHash,
        role,
      });
  
      if (role === "client") {
        await Client.create({
          userId: user._id,
        });
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
  
      user.refreshToken = await bcrypt.hash(refreshToken, 12);
      await user.save();
  
      return res.status(201).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Registration failed.",
        error: err.message,
      });
    }
  };



  exports.login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required.",
        });
      }
  
      const user = await User.findOne({ email }).select(
        "+passwordHash +refreshToken"
      );
  
      if (!user || !user.isActive) {
        return res.status(401).json({
          message: "Invalid credentials.",
        });
      }
  
      const isMatch = await bcrypt.compare(
        password,
        user.passwordHash
      );
  
      if (!isMatch) {
        return res.status(401).json({
          message: "Invalid credentials.",
        });
      }
  
      user.lastLogin = new Date();
  
      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);
  
      user.refreshToken = await bcrypt.hash(refreshToken, 12);
  
      await user.save();
  
      return res.status(200).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Login failed.",
        error: err.message,
      });
    }
  };

  
  exports.refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;
  
      if (!refreshToken) {
        return res.status(400).json({
          message: "Refresh token is required.",
        });
      }
  
      let payload;
  
      try {
        payload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
      } catch {
        return res.status(401).json({
          message: "Invalid or expired refresh token.",
        });
      }
  
      const user = await User.findById(payload.userId).select(
        "+refreshToken"
      );
  
      if (!user || !user.isActive) {
        return res.status(401).json({
          message: "User no longer active.",
        });
      }
  
      if (!user.refreshToken) {
        return res.status(401).json({
          message: "Refresh token revoked.",
        });
      }
  
      const valid = await bcrypt.compare(
        refreshToken,
        user.refreshToken
      );
  
      if (!valid) {
        return res.status(401).json({
          message: "Invalid refresh token.",
        });
      }
  
      const newAccessToken = signAccessToken(user);
  
      return res.status(200).json({
        accessToken: newAccessToken,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Could not refresh token.",
        error: err.message,
      });
    }
  };



  exports.logout = async (req, res) => {
    try {
      const { refreshToken } = req.body;
  
      if (!refreshToken) {
        return res.status(400).json({
          message: "Refresh token is required.",
        });
      }
  
      let payload;
  
      try {
        payload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
      } catch {
        return res.status(401).json({
          message: "Invalid refresh token.",
        });
      }
  
      const user = await User.findById(payload.userId).select(
        "+refreshToken"
      );
  
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
  
      return res.status(200).json({
        message: "Logged out successfully.",
      });
    } catch (err) {
      return res.status(500).json({
        message: "Logout failed.",
        error: err.message,
      });
    }
  };
