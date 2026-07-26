const mongoose = require('mongoose');
const Booking = require('../models/booking');
const Availability = require('../models/availability');
const Client = require('../models/client');
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

// POST /api/bookings
exports.createBooking = asyncHandler(async (req, res) => {
  const { lawyerId, availabilityId, slotId, durationMinutes } = req.body;

  if (!lawyerId || !availabilityId || !slotId) {
    throw new AppError('lawyerId, availabilityId and slotId are required.', 400);
  }

  // CHANGED: was `if (client && client.blockedLawyers.some(...))`, which
  // silently skipped the block check when the client profile was missing.
  // Every other endpoint 404s on a missing profile — this one now matches,
  // so a data bug surfaces immediately instead of quietly letting a
  // booking through.
  const client = await Client.findOne({ userId: req.user.userId });
  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }
  if (client.blockedLawyers.some((id) => id.equals(lawyerId))) {
    throw new AppError('You have blocked this lawyer.', 403);
  }

  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(async () => {
      const availability = await Availability.findOne({
        _id: availabilityId,
        lawyerId,
        'slots._id': slotId,
      }).session(session);

      if (!availability) {
        throw new AppError('Availability slot not found.', 404);
      }

      const slot = availability.slots.id(slotId);
      if (slot.isBooked) {
        throw new AppError('This slot is already booked.', 409);
      }

      const [created] = await Booking.create(
        [
          {
            clientId: req.user.userId,
            lawyerId,
            scheduledAt: slot.startTime,
            durationMinutes: durationMinutes || 30,
            status: 'pending',
          },
        ],
        { session }
      );

      slot.isBooked = true;
      slot.bookingId = created._id;
      await availability.save({ session });

      booking = created;
    });
  } finally {
    session.endSession();
  }

  return sendSuccess(res, 201, { booking });
});

// GET /api/bookings/:id
exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('lawyerId', 'specialization consultationFee')
    .populate('clientId', 'name email');

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (req.user.role === 'client' && !booking.clientId._id.equals(req.user.userId)) {
    throw new AppError('Not authorized to view this booking.', 403);
  }

  return sendSuccess(res, 200, { booking });
});

// GET /api/bookings?status=&page=&limit=
// Always scoped to req.user — never accepts a clientId from the query.
exports.getBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { clientId: req.user.userId };
  if (status) filter.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('lawyerId', 'specialization consultationFee')
      .sort({ scheduledAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, { bookings }, paginationMeta({ total, page, limit }));
});

// PATCH /api/bookings/:id/status
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new AppError('status is required.', 400);
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (!booking.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized to update this booking.', 403);
  }

  const allowed = ALLOWED_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot transition booking from '${booking.status}' to '${status}'.`, 400);
  }

  booking.status = status;
  await booking.save();

  if (status === 'completed') {
    await Lawyer.findByIdAndUpdate(booking.lawyerId, { $inc: { totalConsultations: 1 } });
  }

  return sendSuccess(res, 200, { booking });
});

// POST /api/bookings/:id/cancel
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (!booking.clientId.equals(req.user.userId)) {
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

  // Cancellation only flips status — if a payment was already made, the
  // frontend should follow up with POST /api/refunds using this
  // bookingId. Kept as two separate calls (see refundController).
  return sendSuccess(res, 200, { booking, cancellationReason: reason || null });
});