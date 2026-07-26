const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const lawyerBookingController = require('../controllers/lawyerBookingController');

router.use(verifyToken, requireRole('lawyer'));

router.get('/', lawyerBookingController.getMyBookings);
router.get('/:id', lawyerBookingController.getBookingById);
router.patch('/:id/complete', lawyerBookingController.markCompleted);
router.post('/:id/cancel', lawyerBookingController.cancelBooking);

module.exports = router;