const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

router.use(verifyToken, requireRole('client'));

router.post('/', bookingController.createBooking);
router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBookingById);
router.patch('/:id/status', bookingController.updateBookingStatus);
router.post('/:id/cancel', bookingController.cancelBooking);

module.exports = router;