const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const payoutController = require('../controllers/payoutController');

router.use(verifyToken, requireRole('lawyer'));

router.get('/earnings', payoutController.getMyEarnings);
router.get('/payouts', payoutController.getPayoutHistory);
router.get('/payments/booking/:bookingId', payoutController.getPaymentByBookingId);

module.exports = router;
