const jwt = require('jsonwebtoken');

// Pulls the token out of "Authorization: Bearer <token>". Returns null
// (not an error) if the header is missing or malformed, so both
// verifyToken and attachUserIfPresent can share this without duplicating
// the parsing logic.
function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

// Requires a valid access token. Used on every client and lawyer route —
// this is identity-only, it does not check role (see requireRole below
// for that).
exports.verifyToken = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

// Same decode as verifyToken, but never rejects the request. Used only on
// public routes (lawyer browse/search) where a logged-in client should get
// personalized fields (isSaved/isBlocked) but an anonymous visitor must
// still be able to load the page. req.user is simply left undefined if
// there's no token or it's invalid — downstream controllers must check
// `if (req.user)` before using it, never assume it exists.
exports.attachUserIfPresent = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
  } catch (err) {
    // Invalid/expired token on an optional-auth route is not an error —
    // just treat the request as anonymous.
  }
  return next();
};

// Must run AFTER verifyToken (relies on req.user already being set).
// Accepts either a single role string or multiple roles, e.g.
// requireRole('lawyer') or requireRole('lawyer', 'admin').
exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
};