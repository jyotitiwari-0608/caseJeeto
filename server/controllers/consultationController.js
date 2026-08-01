// controllers/consultationController.js
const Booking = require('../models/booking');
const Lawyer = require('../models/lawyer');
const dailyProvider = require('../services/video/dailyProvider');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { MAX_CALL_MINUTES, EARLY_JOIN_MINUTES } = require('../config/videoCallRules');

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

  // NOTE: the access/token window below is capped to MAX_CALL_MINUTES
  // (15 min) after the scheduled start — deliberately NOT
  // booking.durationMinutes, which only reflects the slot length the
  // client selected and paid for. A video consultation is never allowed
  // to run longer than the 15-minute policy regardless of the booked
  // length. See config/videoCallRules.js for why this lives in one place.
  const scheduledAt = new Date(booking.scheduledAt);
  const opensAt = new Date(scheduledAt.getTime() - EARLY_JOIN_MINUTES * 60 * 1000);
  const closesAt = new Date(scheduledAt.getTime() + MAX_CALL_MINUTES * 60 * 1000);
  const now = new Date();
  if (now < opensAt) {
    throw new AppError(
      `Consultation access opens ${EARLY_JOIN_MINUTES} minutes before the scheduled time.`,
      403
    );
  }
  if (now > closesAt) {
    throw new AppError('The consultation access window has ended.', 410);
  }

  // Room is normally created at payment-verification time (see
  // paymentController.verifyPayment). This is a fallback for older
  // bookings or if that step ever failed.
  if (!booking.dailyRoomUrl) {
    const room = await dailyProvider.createRoom(booking);
    booking.dailyRoomUrl = room.url;
    await booking.save();
  }

  let roomName;
  try {
    roomName = new URL(booking.dailyRoomUrl).pathname.split('/').filter(Boolean).pop();
  } catch {
    throw new AppError('Consultation room is unavailable.', 503);
  }
  if (!roomName) throw new AppError('Consultation room is unavailable.', 503);

  let displayName = 'Participant';
  if (isLawyer) {
    const lawyer = await Lawyer.findOne({ userId: req.user.userId }).populate('userId', 'name');
    displayName = lawyer?.userId?.name || 'Lawyer';
  }

  const token = await dailyProvider.createMeetingToken(roomName, {
    userId: req.user.userId,
    name: displayName,
    isOwner: isLawyer,
    expiresAt: closesAt,
  });

  return sendSuccess(res, 200, {
    roomUrl: booking.dailyRoomUrl,
    token,
    accessClosesAt: closesAt,
    maxCallMinutes: MAX_CALL_MINUTES,
  });
});
