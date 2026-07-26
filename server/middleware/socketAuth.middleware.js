const jwt = require('jsonwebtoken');

// Socket.IO middleware, NOT an Express middleware — different signature
// ((socket, next), not (req, res, next)) and different way of signaling
// failure (next(new Error(...)) rejects the connection attempt entirely,
// there's no res.status() to call).
//
// Wire this in with: io.use(socketAuthMiddleware)
//
// The client must send the token via the handshake auth payload, e.g.:
//   io(SOCKET_URL, { auth: { token: accessToken } })
// NOT a query string — query strings are more likely to get logged
// (server access logs, proxies, browser history) than an auth payload,
// which is why the Build Mode plan specifies this explicitly.
module.exports = (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication token is required.'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // Same shape as req.user in the Express auth middleware, so any
    // shared logic (e.g. "is this user allowed in this conversation")
    // can be written once and reused conceptually across both.
    socket.user = { userId: payload.userId, role: payload.role };
    return next();
  } catch (err) {
    return next(new Error('Invalid or expired authentication token.'));
  }
};