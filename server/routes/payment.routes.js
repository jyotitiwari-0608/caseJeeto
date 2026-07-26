const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.use(verifyToken, requireRole('client'));

router.post('/orders', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/booking/:bookingId', paymentController.getPaymentByBookingId);
router.get('/me', paymentController.getMyPaymentHistory);
router.get('/with-lawyer/:lawyerId', paymentController.getMyBookingsWithLawyer);
router.get('/:paymentId/invoice', paymentController.downloadInvoice);

// NOTE: POST /api/payments/webhook (Razorpay -> server) must NOT go
// through verifyToken — Razorpay isn't sending a client JWT, it's sending
// its own webhook signature. Mount that route separately, unauthenticated,
// once the webhook handler from Phase 9 is built (see Phase 9 prompt).

module.exports = router;