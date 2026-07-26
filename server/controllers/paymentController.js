const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/payment');
const Booking = require('../models/booking');
const Lawyer = require('../models/lawyer');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLATFORM_FEE_PERCENT = 15;

// NOTE on money: every field is stored and computed in paise internally.
// Consistent rupee display happens automatically wherever a Payment doc
// is serialized to JSON (see the toJSON transform in models/payment.js) —
// controllers below never do their own /100 math, so there's nowhere for
// a stray "10000x price" bug to sneak in.

// POST /api/payments/orders
exports.createOrder = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (!booking.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized for this booking.', 403);
  }
  if (booking.status !== 'pending') {
    throw new AppError('Booking is not awaiting payment.', 400);
  }

  const lawyer = await Lawyer.findById(booking.lawyerId);
  if (!lawyer) {
    throw new AppError('Lawyer not found.', 404);
  }
  if (!lawyer.consultationFee || lawyer.consultationFee <= 0) {
    // Guards against booking a lawyer who hasn't set a real fee yet
    // (consultationFee defaults to 0 at registration).
    throw new AppError('This lawyer has not set a consultation fee yet.', 400);
  }

  const consultationFee = lawyer.consultationFee * 100; // paise
  const platformFee = Math.round(consultationFee * (PLATFORM_FEE_PERCENT / 100));
  const lawyerPayout = consultationFee - platformFee;

  const order = await razorpay.orders.create({
    amount: consultationFee,
    currency: 'INR',
    receipt: `booking_${booking._id}`,
    notes: { bookingId: String(booking._id) },
  });

  const payment = await Payment.create({
    clientId: req.user.userId,
    lawyerId: booking.lawyerId,
    bookingId: booking._id,
    consultationFee,
    platformFee,
    lawyerPayout,
    razorpayOrderId: order.id,
    razorpayLinkedAccountId: lawyer.razorpayAccountId,
    paymentStatus: 'created',
  });

  return sendSuccess(res, 201, { order, payment, keyId: process.env.RAZORPAY_KEY_ID });
});

// POST /api/payments/verify
// Confirms the Razorpay checkout signature. `webhookVerified` should only
// ever be set true by a separate Razorpay webhook handler, not here —
// never trust the frontend's word alone that a payment succeeded.
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new AppError('Missing Razorpay verification fields.', 400);
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { paymentStatus: 'failed', failureReason: 'Signature mismatch' }
    );
    throw new AppError('Payment verification failed.', 400);
  }

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    { razorpayPaymentId, paymentStatus: 'paid' },
    { new: true }
  );
  if (!payment) {
    throw new AppError('Payment record not found.', 404);
  }

  await Booking.findByIdAndUpdate(payment.bookingId, {
    status: 'confirmed',
    paymentId: payment._id,
  });

  return sendSuccess(res, 200, { payment });
});

// GET /api/payments/booking/:bookingId
exports.getPaymentByBookingId = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    bookingId: req.params.bookingId,
    clientId: req.user.userId,
  });
  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }
  return sendSuccess(res, 200, { payment });
});

// GET /api/payments/me
// All of this client's own payment history. Never accepts a clientId
// param — always scoped to req.user.
exports.getMyPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = { clientId: req.user.userId };

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('lawyerId', 'specialization')
      .populate('bookingId', 'scheduledAt status')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, { payments }, paginationMeta({ total, page, limit }));
});

// GET /api/payments/with-lawyer/:lawyerId
// Bill history with ONE specific lawyer — scoped to (this client, that
// lawyer) only. Deliberately named to avoid ever being confused with "all
// of a lawyer's bookings", which would leak other clients' data.
exports.getMyBookingsWithLawyer = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    clientId: req.user.userId,
    lawyerId: req.params.lawyerId,
  })
    .populate('bookingId', 'scheduledAt status')
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, { payments });
});

// GET /api/payments/:paymentId/invoice
// Returns invoice data as JSON. Rendering to an actual PDF file is a
// separate concern — feed this response into a template with pdfkit or
// puppeteer once you're ready to generate downloadable files.
exports.downloadInvoice = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    clientId: req.user.userId,
  })
    .populate('lawyerId', 'specialization')
    .populate('bookingId', 'scheduledAt durationMinutes');

  if (!payment) {
    throw new AppError('Payment not found.', 404);
  }
  if (payment.paymentStatus !== 'paid') {
    throw new AppError('Invoice is only available for paid bookings.', 400);
  }

  const invoice = {
    invoiceId: `INV-${payment._id}`,
    date: payment.createdAt,
    payment, // already rupee-formatted via toJSON transform
    booking: payment.bookingId,
    lawyer: payment.lawyerId,
  };

  return sendSuccess(res, 200, { invoice });
});