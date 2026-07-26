// lawyerBookingController.js
const Booking = require('../models/booking');
const Availability = require('../models/availibility');
const Lawyer = require('../models/lawyer');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// GET /api/lawyers/me/bookings?status=&page=&limit=
// Always scoped to req.user — a lawyer only ever sees their own bookings.
exports.getMyBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { lawyerId: req.user.userId };
  if (status) filter.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('clientId', 'name email')
      .sort({ scheduledAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, { bookings }, paginationMeta({ total, page, limit }));
});

// GET /api/lawyers/me/bookings/:id
exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('clientId', 'name email');

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (!booking.lawyerId.equals(req.user.userId)) {
    throw new AppError('Not authorized to view this booking.', 403);
  }

  return sendSuccess(res, 200, { booking });
});

// PATCH /api/lawyers/me/bookings/:id/complete
exports.markCompleted = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) throw new AppError('Booking not found.', 404);
  if (!booking.lawyerId.equals(req.user.userId)) {
    throw new AppError('Not authorized to update this booking.', 403);
  }

  const allowed = ALLOWED_TRANSITIONS[booking.status] || [];
  if (!allowed.includes('completed')) {
    throw new AppError(`Cannot mark a booking as completed from status '${booking.status}'.`, 400);
  }

  booking.status = 'completed';
  await booking.save();

  // CHANGED: booking.lawyerId is the lawyer's USER id, not a Lawyer
  // profile _id — Lawyer.findByIdAndUpdate(booking.lawyerId, ...) was
  // looking up the wrong collection key and silently updating nothing.
  await Lawyer.findOneAndUpdate({ userId: booking.lawyerId }, { $inc: { totalConsultations: 1 } });

  return sendSuccess(res, 200, { booking });
});

// POST /api/lawyers/me/bookings/:id/cancel
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (!booking.lawyerId.equals(req.user.userId)) {
    throw new AppError('Not authorized to cancel this booking.', 403);
  }
  if (!(ALLOWED_TRANSITIONS[booking.status] || []).includes('cancelled')) {
    throw new AppError(`Cannot cancel a booking in status '${booking.status}'.`, 400);
  }

  booking.status = 'cancelled';
  await booking.save();

  await Availability.updateOne(
    { 'slots.bookingId': booking._id },
    { $set: { 'slots.$.isBooked': false, 'slots.$.bookingId': null } }
  );

  // Mirrors client-side cancelBooking in bookingController.js: status flip
  // only, no automatic refund. If a payment was made, that has to be
  // handled separately (e.g. an admin-initiated refund for a lawyer
  // cancellation, since the client didn't request it themselves here).
  return sendSuccess(res, 200, { booking, cancellationReason: reason || null });
});