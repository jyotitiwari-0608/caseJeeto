// Example of how every route file above mounts onto the Express app.
// Drop this into server.js (or require it from there) in place of any
// inline route definitions.

const express = require('express');
const app = express(); // or: module.exports = (app) => { ... } if server.js
                        // already owns the app instance

app.use(express.json());

// --- Public / auth ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/lawyers', require('./routes/publicLawyerRoutes')); // GET / and GET /:id are public

// --- Client-facing ---
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// --- Lawyer-facing (all scoped under /api/lawyers/me/...) ---
app.use('/api/lawyers', require('./routes/lawyerSelfRoutes'));
app.use('/api/lawyers/me/verification', require('./routes/lawyerVerificationRoutes'));
app.use('/api/lawyers/me/availability', require('./routes/lawyerAvailabilityRoutes'));
app.use('/api/lawyers/me/bookings', require('./routes/lawyerBookingRoutes'));
app.use('/api/lawyers/me', require('./routes/payoutRoutes'));
app.use('/api/lawyers/me/reviews', require('./routes/lawyerReviewRoutes'));
app.use('/api/lawyers/me/conversations', require('./routes/lawyerMessageRoutes'));
app.use('/api/lawyers/me/dashboard', require('./routes/dashboardRoutes'));

// NOTE ON ROUTE ORDER: publicLawyerRoutes defines GET /api/lawyers/:id.
// lawyerSelfRoutes defines GET /api/lawyers/me. Express matches routes in
// registration order, and ':id' would greedily match the literal string
// 'me' if publicLawyerRoutes were mounted after lawyerSelfRoutes on the
// same path. Mount publicLawyerRoutes and lawyerSelfRoutes in this exact
// order (public first) to avoid 'me' being swallowed as an :id param —
// or better, give lawyer-self its own path prefix (e.g. /api/lawyer/me)
// entirely so the two route trees never collide on /api/lawyers.

module.exports = app;
