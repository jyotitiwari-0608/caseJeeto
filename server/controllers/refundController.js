const Payment = require('../models/payment');
const Booking = require('../models/booking');
const Refund = require('../models/refund');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

// Reasons a CLIENT is allowed to self-select when requesting a refund.
// Reasons like LAWYER_MISCONDUCT or ADMIN_GOODWILL require admin judgment
// and should only ever be set by an admin controller, never by this one.
const CLIENT_SELECTABLE_REASONS = [
  'CLIENT_CANCELLED_WITHIN_POLICY',
  'CLIENT_CANCELLED_OUTSIDE_POLICY',
  'LAWYER_CANCELLED',
  'LAWYER_NO_SHOW',
  'TECHNICAL_FAILURE',
  'DUPLICATE_PAYMENT',
  'OTHER',
];

// POST /api/refunds
// Creates a refund request in `requested` status — this does NOT call
// Razorpay. Actually issuing the refund (status -> processing/completed)
// happens in an admin controller after evidence is reviewed, since money
// should never leave the platform account on the client's say-so alone.
exports.requestRefund = asyncHandler(async (req, res) => {
  const { bookingId, refundReason, refundNote, evidence } = req.body;

  if (!bookingId || !refundReason || !evidence) {
    throw new AppError('bookingId, refundReason and evidence are required.', 400, [
      ...(!bookingId ? [{ field: 'bookingId', message: 'Required.' }] : []),
      ...(!refundReason ? [{ field: 'refundReason', message: 'Required.' }] : []),
      ...(!evidence ? [{ field: 'evidence', message: 'Required.' }] : []),
    ]);
  }
  if (!CLIENT_SELECTABLE_REASONS.includes(refundReason)) {
    throw new AppError('Invalid refund reason for a client-initiated request.', 400, [
      { field: 'refundReason', message: 'Not a client-selectable reason.' },
    ]);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (!booking.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized for this booking.', 403);
  }

  const payment = await Payment.findOne({ bookingId, paymentStatus: 'paid' });
  if (!payment) {
    throw new AppError('No paid payment found for this booking.', 400);
  }

  const existing = await Refund.findOne({ bookingId, refundStatus: { $ne: 'rejected' } });
  if (existing) {
    throw new AppError('A refund request already exists for this booking.', 409);
  }

  const refund = await Refund.create({
    paymentId: payment._id,
    bookingId,
    clientId: req.user.userId,
    lawyerId: booking.lawyerId,
    refundAmount: payment.consultationFee, // full amount by default; admin can adjust on approval
    refundReason,
    refundNote,
    reasonVerification: { evidence },
    refundStatus: 'requested',
  });

  return sendSuccess(res, 201, { refund });
});

// GET /api/refunds/:id
exports.getRefundById = asyncHandler(async (req, res) => {
  const refund = await Refund.findById(req.params.id);
  if (!refund) {
    throw new AppError('Refund not found.', 404);
  }
  if (!refund.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized to view this refund.', 403);
  }
  return sendSuccess(res, 200, { refund });
});

// GET /api/refunds/me
exports.getMyRefunds = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { clientId: req.user.userId };
  if (status) filter.refundStatus = status;

  const [refunds, total] = await Promise.all([
    Refund.find(filter)
      .populate('bookingId', 'scheduledAt')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Refund.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, { refunds }, paginationMeta({ total, page, limit }));
});
