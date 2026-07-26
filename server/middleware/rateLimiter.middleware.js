// Requires: npm install express-rate-limit
const rateLimit = require('express-rate-limit');

// Applied to POST /api/auth/login only. Limits brute-force password
// guessing per IP. Keyed by IP (the library's default) rather than by the
// email being attempted, since an attacker controls the email field but
// not their own IP as easily.
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true, // adds RateLimit-* response headers
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});

// Applied to POST /api/payments/orders only. Limits how many payment
// orders a single IP can spin up in a short window — mainly to blunt
// scripted abuse against your Razorpay account, not normal user behavior
// (a real client creates one order per booking, rarely back-to-back).
exports.paymentOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment attempts. Please wait a few minutes and try again.' },
});