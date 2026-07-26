// controllers/consultationController.js
const Booking = require('../models/booking');
const Lawyer = require('../models/lawyer');
const dailyProvider = require('../services/video/dailyProvider');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/bookings/:id/video-token  (client)
// GET /api/lawyers/me/bookings/:id/video-token  (lawyer)
// Both routes point at this same handler. req.user.role tells us which
// side of the booking is asking, so ownership is checked against the
// matching field either way.
exports.getVideoToken = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);

  const isClient = req.user.role === 'client' && booking.clientId.equals(req.user.userId);
  const isLawyer = req.user.role === 'lawyer' && booking.lawyerId.equals(req.user.userId);
  if (!isClient && !isLawyer) {
    throw new AppError('Not authorized for this consultation.', 403);
  }

  if (booking.status !== 'confirmed') {
    throw new AppError(`Video access is only available for confirmed bookings (currently '${booking.status}').`, 400);
  }

  // Room is normally created at payment-verification time (see
  // paymentController.verifyPayment). This is a fallback for older
  // bookings or if that step ever failed.
  if (!booking.dailyRoomUrl) {
    const room = await dailyProvider.createRoom(booking);
    booking.dailyRoomUrl = room.url;
    await booking.save();
  }

  const roomName = booking.dailyRoomUrl.split('/').pop();

  let displayName = 'Participant';
  if (isLawyer) {
    const lawyer = await Lawyer.findOne({ userId: req.user.userId }).populate('userId', 'name');
    displayName = lawyer?.userId?.name || 'Lawyer';
  }

  const token = await dailyProvider.createMeetingToken(roomName, {
    userId: req.user.userId,
    name: displayName,
    isOwner: isLawyer,
  });

  return sendSuccess(res, 200, { roomUrl: booking.dailyRoomUrl, token });
});