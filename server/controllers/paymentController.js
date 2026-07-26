// // paymentController.js
// paymentController.js
const crypto = require('crypto');
const Payment = require('../models/payment');
const Booking = require('../models/booking');
const Lawyer = require('../models/lawyer');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');
const dailyProvider = require('../services/video/dailyProvider');

const PLATFORM_FEE_PERCENT = 15;

// CHANGED: `razorpay` ships as an ESM package with a top-level await
// somewhere in its dependency graph. Node's CJS require() can load plain
// ESM synchronously, but NOT ESM with top-level await (ERR_REQUIRE_ASYNC_MODULE)
// — so `require('razorpay')` at module load time crashed the server before
// it could even start. Lazily import() it instead, cached after first use,
// so the cost/async-ness is paid once on first real payment call, not at
// boot.
let razorpayInstance = null;
async function getRazorpay() {
  if (!razorpayInstance) {
    const { default: Razorpay } = await import('razorpay');
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

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

  const lawyer = await Lawyer.findOne({ userId: booking.lawyerId });
  if (!lawyer) {
    throw new AppError('Lawyer not found.', 404);
  }
  if (!lawyer.consultationFee || lawyer.consultationFee <= 0) {
    throw new AppError('This lawyer has not set a consultation fee yet.', 400);
  }

  const consultationFee = lawyer.consultationFee * 100; // paise
  const platformFee = Math.round(consultationFee * (PLATFORM_FEE_PERCENT / 100));
  const lawyerPayout = consultationFee - platformFee;

  const razorpay = await getRazorpay();
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
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new AppError('Missing Razorpay verification fields.', 400);
  }

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) {
    throw new AppError('Payment record not found.', 404);
  }
  if (!payment.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized for this payment.', 403);
  }

  if (payment.paymentStatus === 'paid') {
    return sendSuccess(res, 200, { payment });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    payment.paymentStatus = 'failed';
    payment.failureReason = 'Signature mismatch';
    await payment.save();
    throw new AppError('Payment verification failed.', 400);
  }

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.paymentStatus = 'paid';
  await payment.save();

  await Booking.findByIdAndUpdate(payment.bookingId, {
    status: 'confirmed',
    paymentId: payment._id,
  });

  const booking = await Booking.findById(payment.bookingId);
  if (booking && !booking.dailyRoomUrl) {
    try {
      const room = await dailyProvider.createRoom(booking);
      booking.dailyRoomUrl = room.url;
      await booking.save();
    } catch (err) {
      console.error('Daily room creation failed:', err.message);
    }
  }

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
exports.getMyPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = { clientId: req.user.userId };

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('lawyerId', 'name email')
      .populate('bookingId', 'scheduledAt status')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, { payments }, paginationMeta({ total, page, limit }));
});

// GET /api/payments/with-lawyer/:lawyerId
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
exports.downloadInvoice = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    clientId: req.user.userId,
  })
    .populate('lawyerId', 'name email')
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
    payment,
    booking: payment.bookingId,
    lawyer: payment.lawyerId,
  };

  return sendSuccess(res, 200, { invoice });
});

// POST /api/payments/webhook
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ message: 'Missing webhook signature.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'payment.captured') {
      const razorpayOrderId = event.payload.payment.entity.order_id;
      const payment = await Payment.findOne({ razorpayOrderId });

      if (payment && payment.paymentStatus !== 'paid') {
        payment.razorpayPaymentId = event.payload.payment.entity.id;
        payment.paymentStatus = 'paid';
        payment.webhookVerified = true;
        await payment.save();

        await Booking.findByIdAndUpdate(payment.bookingId, {
          status: 'confirmed',
          paymentId: payment._id,
        });
      } else if (payment) {
        payment.webhookVerified = true;
        await payment.save();
      }
    }

    if (event.event === 'refund.processed') {
      const razorpayPaymentId = event.payload.refund.entity.payment_id;
      const razorpayRefundId = event.payload.refund.entity.id;
      const refundedAmount = event.payload.refund.entity.amount;

      const payment = await Payment.findOne({ razorpayPaymentId });
      if (payment && payment.paymentStatus !== 'refunded') {
        payment.paymentStatus = 'refunded';
        payment.refundAmount = refundedAmount;
        payment.refundedAt = new Date();
        payment.razorpayRefundId = razorpayRefundId;
        await payment.save();

        const Refund = require('../models/refund');
        await Refund.findOneAndUpdate(
          { paymentId: payment._id, refundStatus: { $ne: 'completed' } },
          { refundStatus: 'completed', razorpayRefundId, refundedAt: new Date() }
        );
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing failed:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
};
// // paymentController.js
// const crypto = require('crypto');
// const Razorpay = require('razorpay');
// const Payment = require('../models/payment');
// const Booking = require('../models/booking');
// const Lawyer = require('../models/lawyer');
// const asyncHandler = require('../middleware/asyncHandler');
// const AppError = require('../utils/AppError');
// const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// const PLATFORM_FEE_PERCENT = 15;

// // POST /api/payments/orders
// exports.createOrder = asyncHandler(async (req, res) => {
//   const { bookingId } = req.body;

//   const booking = await Booking.findById(bookingId);
//   if (!booking) {
//     throw new AppError('Booking not found.', 404);
//   }
//   if (!booking.clientId.equals(req.user.userId)) {
//     throw new AppError('Not authorized for this booking.', 403);
//   }
//   if (booking.status !== 'pending') {
//     throw new AppError('Booking is not awaiting payment.', 400);
//   }

//   // CHANGED: booking.lawyerId is the lawyer's USER id (see models/booking.js),
//   // not a Lawyer profile _id — Lawyer.findById(booking.lawyerId) was looking
//   // up the wrong collection key and would silently 404 real bookings.
//   const lawyer = await Lawyer.findOne({ userId: booking.lawyerId });
//   if (!lawyer) {
//     throw new AppError('Lawyer not found.', 404);
//   }
//   if (!lawyer.consultationFee || lawyer.consultationFee <= 0) {
//     throw new AppError('This lawyer has not set a consultation fee yet.', 400);
//   }

//   const consultationFee = lawyer.consultationFee * 100; // paise
//   const platformFee = Math.round(consultationFee * (PLATFORM_FEE_PERCENT / 100));
//   const lawyerPayout = consultationFee - platformFee;

//   const order = await razorpay.orders.create({
//     amount: consultationFee,
//     currency: 'INR',
//     receipt: `booking_${booking._id}`,
//     notes: { bookingId: String(booking._id) },
//   });

//   const payment = await Payment.create({
//     clientId: req.user.userId,
//     lawyerId: booking.lawyerId,
//     bookingId: booking._id,
//     consultationFee,
//     platformFee,
//     lawyerPayout,
//     razorpayOrderId: order.id,
//     razorpayLinkedAccountId: lawyer.razorpayAccountId,
//     paymentStatus: 'created',
//   });

//   return sendSuccess(res, 201, { order, payment, keyId: process.env.RAZORPAY_KEY_ID });
// });

// // POST /api/payments/verify
// exports.verifyPayment = asyncHandler(async (req, res) => {
//   const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

//   if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
//     throw new AppError('Missing Razorpay verification fields.', 400);
//   }

//   // CHANGED: load + ownership-check the payment BEFORE mutating anything.
//   // The old code ran findOneAndUpdate keyed only on razorpayOrderId, with
//   // no check that the payment belonged to the calling client — any logged
//   // -in client who knew/guessed an orderId could flip someone else's
//   // payment to 'paid' or 'failed'.
//   const payment = await Payment.findOne({ razorpayOrderId });
//   if (!payment) {
//     throw new AppError('Payment record not found.', 404);
//   }
//   if (!payment.clientId.equals(req.user.userId)) {
//     throw new AppError('Not authorized for this payment.', 403);
//   }

//   // Idempotency: if this was already verified (e.g. a retried frontend
//   // call), just return the existing record instead of re-processing.
//   if (payment.paymentStatus === 'paid') {
//     return sendSuccess(res, 200, { payment });
//   }

//   const expectedSignature = crypto
//     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//     .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//     .digest('hex');

//   if (expectedSignature !== razorpaySignature) {
//     payment.paymentStatus = 'failed';
//     payment.failureReason = 'Signature mismatch';
//     await payment.save();
//     throw new AppError('Payment verification failed.', 400);
//   }

//   payment.razorpayPaymentId = razorpayPaymentId;
//   payment.paymentStatus = 'paid';
//   await payment.save();

//   await Booking.findByIdAndUpdate(payment.bookingId, {
//     status: 'confirmed',
//     paymentId: payment._id,
//   });

//   return sendSuccess(res, 200, { payment });
// });

// // GET /api/payments/booking/:bookingId
// exports.getPaymentByBookingId = asyncHandler(async (req, res) => {
//   const payment = await Payment.findOne({
//     bookingId: req.params.bookingId,
//     clientId: req.user.userId,
//   });
//   if (!payment) {
//     throw new AppError('Payment not found.', 404);
//   }
//   return sendSuccess(res, 200, { payment });
// });

// // GET /api/payments/me
// exports.getMyPaymentHistory = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 20 } = req.query;
//   const filter = { clientId: req.user.userId };

//   const [payments, total] = await Promise.all([
//     Payment.find(filter)
//       // lawyerId refs User — see note in bookingController.js
//       .populate('lawyerId', 'name email')
//       .populate('bookingId', 'scheduledAt status')
//       .sort({ createdAt: -1 })
//       .skip((Number(page) - 1) * Number(limit))
//       .limit(Number(limit)),
//     Payment.countDocuments(filter),
//   ]);

//   return sendSuccess(res, 200, { payments }, paginationMeta({ total, page, limit }));
// });

// // GET /api/payments/with-lawyer/:lawyerId
// // NOTE: :lawyerId here must be the lawyer's USER id, to match Payment.lawyerId.
// exports.getMyBookingsWithLawyer = asyncHandler(async (req, res) => {
//   const payments = await Payment.find({
//     clientId: req.user.userId,
//     lawyerId: req.params.lawyerId,
//   })
//     .populate('bookingId', 'scheduledAt status')
//     .sort({ createdAt: -1 });

//   return sendSuccess(res, 200, { payments });
// });

// // GET /api/payments/:paymentId/invoice
// exports.downloadInvoice = asyncHandler(async (req, res) => {
//   const payment = await Payment.findOne({
//     _id: req.params.paymentId,
//     clientId: req.user.userId,
//   })
//     .populate('lawyerId', 'name email')
//     .populate('bookingId', 'scheduledAt durationMinutes');

//   if (!payment) {
//     throw new AppError('Payment not found.', 404);
//   }
//   if (payment.paymentStatus !== 'paid') {
//     throw new AppError('Invoice is only available for paid bookings.', 400);
//   }

//   const invoice = {
//     invoiceId: `INV-${payment._id}`,
//     date: payment.createdAt,
//     payment,
//     booking: payment.bookingId,
//     lawyer: payment.lawyerId,
//   };

//   return sendSuccess(res, 200, { invoice });
// });
// // paymentController.js — add these two blocks to the existing file

// // (1) At the top, alongside the other requires:
// const dailyProvider = require('../services/video/dailyProvider');

// // (2) Inside verifyPayment, right after the booking is confirmed, before
// // the final `return sendSuccess`:
// //
// //   await Booking.findByIdAndUpdate(payment.bookingId, {
// //     status: 'confirmed',
// //     paymentId: payment._id,
// //   });
// //
// // add:
//   const booking = await Booking.findById(payment.bookingId);
//   if (booking && !booking.dailyRoomUrl) {
//     try {
//       const room = await dailyProvider.createRoom(booking);
//       booking.dailyRoomUrl = room.url;
//       await booking.save();
//     } catch (err) {
//       // Don't fail the payment over a video-room hiccup — the fallback in
//       // consultationController.getVideoToken will create it on first join.
//       console.error('Daily room creation failed:', err.message);
//     }
//   }

// // (3) New export, appended to the bottom of the file:

// // POST /api/payments/webhook
// // Razorpay -> server, no client JWT. Mounted in server.js with
// // express.raw({ type: 'application/json' }) BEFORE express.json() — the
// // signature below is computed over the raw request bytes, so it must
// // never be parsed into an object first.
// // Requires RAZORPAY_WEBHOOK_SECRET in .env (set in the Razorpay dashboard
// // webhook config, separate from RAZORPAY_KEY_SECRET).
// exports.handleWebhook = async (req, res) => {
//   try {
//     const signature = req.headers['x-razorpay-signature'];
//     if (!signature) {
//       return res.status(400).json({ message: 'Missing webhook signature.' });
//     }

//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
//       .update(req.body) // raw Buffer, thanks to express.raw()
//       .digest('hex');

//     if (expectedSignature !== signature) {
//       return res.status(400).json({ message: 'Invalid webhook signature.' });
//     }

//     const event = JSON.parse(req.body.toString());

//     // Authoritative confirmation of a captured payment. Idempotent against
//     // the client-driven verifyPayment flow above — if verifyPayment already
//     // ran, this just no-ops on an already-'paid' record.
//     if (event.event === 'payment.captured') {
//       const razorpayOrderId = event.payload.payment.entity.order_id;
//       const payment = await Payment.findOne({ razorpayOrderId });

//       if (payment && payment.paymentStatus !== 'paid') {
//         payment.razorpayPaymentId = event.payload.payment.entity.id;
//         payment.paymentStatus = 'paid';
//         payment.webhookVerified = true;
//         await payment.save();

//         await Booking.findByIdAndUpdate(payment.bookingId, {
//           status: 'confirmed',
//           paymentId: payment._id,
//         });
//       } else if (payment) {
//         payment.webhookVerified = true;
//         await payment.save();
//       }
//     }

//     // Authoritative confirmation that a refund actually completed on
//     // Razorpay's side — mirrors adminRefundController.markProcessed, so a
//     // refund gets closed out here too if an admin forgets the manual step.
//     if (event.event === 'refund.processed') {
//       const razorpayPaymentId = event.payload.refund.entity.payment_id;
//       const razorpayRefundId = event.payload.refund.entity.id;
//       const refundedAmount = event.payload.refund.entity.amount;

//       const payment = await Payment.findOne({ razorpayPaymentId });
//       if (payment && payment.paymentStatus !== 'refunded') {
//         payment.paymentStatus = 'refunded';
//         payment.refundAmount = refundedAmount;
//         payment.refundedAt = new Date();
//         payment.razorpayRefundId = razorpayRefundId;
//         await payment.save();

//         const Refund = require('../models/refund');
//         await Refund.findOneAndUpdate(
//           { paymentId: payment._id, refundStatus: { $ne: 'completed' } },
//           { refundStatus: 'completed', razorpayRefundId, refundedAt: new Date() }
//         );
//       }
//     }

//     // Razorpay expects a 200 quickly, or it will retry the same event —
//     // always ack even for event types we don't act on.
//     return res.status(200).json({ received: true });
//   } catch (err) {
//     console.error('Webhook processing failed:', err);
//     // Still 200 here: a malformed/unexpected payload shouldn't cause
//     // Razorpay to keep retrying forever. Real signature failures already
//     // returned 400 above.
//     return res.status(200).json({ received: true, error: err.message });
//   }
// };

// const crypto = require('crypto');
// const Razorpay = require('razorpay');
// const Payment = require('../models/payment');
// const Booking = require('../models/booking');
// const Lawyer = require('../models/lawyer');
// const asyncHandler = require('../middleware/asyncHandler');
// const AppError = require('../utils/AppError');
// const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// const PLATFORM_FEE_PERCENT = 15;

// // NOTE on money: every field is stored and computed in paise internally.
// // Consistent rupee display happens automatically wherever a Payment doc
// // is serialized to JSON (see the toJSON transform in models/payment.js) —
// // controllers below never do their own /100 math, so there's nowhere for
// // a stray "10000x price" bug to sneak in.

// // POST /api/payments/orders
// exports.createOrder = asyncHandler(async (req, res) => {
//   const { bookingId } = req.body;

//   const booking = await Booking.findById(bookingId);
//   if (!booking) {
//     throw new AppError('Booking not found.', 404);
//   }
//   if (!booking.clientId.equals(req.user.userId)) {
//     throw new AppError('Not authorized for this booking.', 403);
//   }
//   if (booking.status !== 'pending') {
//     throw new AppError('Booking is not awaiting payment.', 400);
//   }

//   const lawyer = await Lawyer.findById(booking.lawyerId);
//   if (!lawyer) {
//     throw new AppError('Lawyer not found.', 404);
//   }
//   if (!lawyer.consultationFee || lawyer.consultationFee <= 0) {
//     // Guards against booking a lawyer who hasn't set a real fee yet
//     // (consultationFee defaults to 0 at registration).
//     throw new AppError('This lawyer has not set a consultation fee yet.', 400);
//   }

//   const consultationFee = lawyer.consultationFee * 100; // paise
//   const platformFee = Math.round(consultationFee * (PLATFORM_FEE_PERCENT / 100));
//   const lawyerPayout = consultationFee - platformFee;

//   const order = await razorpay.orders.create({
//     amount: consultationFee,
//     currency: 'INR',
//     receipt: `booking_${booking._id}`,
//     notes: { bookingId: String(booking._id) },
//   });

//   const payment = await Payment.create({
//     clientId: req.user.userId,
//     lawyerId: booking.lawyerId,
//     bookingId: booking._id,
//     consultationFee,
//     platformFee,
//     lawyerPayout,
//     razorpayOrderId: order.id,
//     razorpayLinkedAccountId: lawyer.razorpayAccountId,
//     paymentStatus: 'created',
//   });

//   return sendSuccess(res, 201, { order, payment, keyId: process.env.RAZORPAY_KEY_ID });
// });

// // POST /api/payments/verify
// // Confirms the Razorpay checkout signature. `webhookVerified` should only
// // ever be set true by a separate Razorpay webhook handler, not here —
// // never trust the frontend's word alone that a payment succeeded.
// exports.verifyPayment = asyncHandler(async (req, res) => {
//   const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

//   if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
//     throw new AppError('Missing Razorpay verification fields.', 400);
//   }

//   const expectedSignature = crypto
//     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//     .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//     .digest('hex');

//   if (expectedSignature !== razorpaySignature) {
//     await Payment.findOneAndUpdate(
//       { razorpayOrderId },
//       { paymentStatus: 'failed', failureReason: 'Signature mismatch' }
//     );
//     throw new AppError('Payment verification failed.', 400);
//   }

//   const payment = await Payment.findOneAndUpdate(
//     { razorpayOrderId },
//     { razorpayPaymentId, paymentStatus: 'paid' },
//     { new: true }
//   );
//   if (!payment) {
//     throw new AppError('Payment record not found.', 404);
//   }

//   await Booking.findByIdAndUpdate(payment.bookingId, {
//     status: 'confirmed',
//     paymentId: payment._id,
//   });

//   return sendSuccess(res, 200, { payment });
// });

// // GET /api/payments/booking/:bookingId
// exports.getPaymentByBookingId = asyncHandler(async (req, res) => {
//   const payment = await Payment.findOne({
//     bookingId: req.params.bookingId,
//     clientId: req.user.userId,
//   });
//   if (!payment) {
//     throw new AppError('Payment not found.', 404);
//   }
//   return sendSuccess(res, 200, { payment });
// });

// // GET /api/payments/me
// // All of this client's own payment history. Never accepts a clientId
// // param — always scoped to req.user.
// exports.getMyPaymentHistory = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 20 } = req.query;
//   const filter = { clientId: req.user.userId };

//   const [payments, total] = await Promise.all([
//     Payment.find(filter)
//       .populate('lawyerId', 'specialization')
//       .populate('bookingId', 'scheduledAt status')
//       .sort({ createdAt: -1 })
//       .skip((Number(page) - 1) * Number(limit))
//       .limit(Number(limit)),
//     Payment.countDocuments(filter),
//   ]);

//   return sendSuccess(res, 200, { payments }, paginationMeta({ total, page, limit }));
// });

// // GET /api/payments/with-lawyer/:lawyerId
// // Bill history with ONE specific lawyer — scoped to (this client, that
// // lawyer) only. Deliberately named to avoid ever being confused with "all
// // of a lawyer's bookings", which would leak other clients' data.
// exports.getMyBookingsWithLawyer = asyncHandler(async (req, res) => {
//   const payments = await Payment.find({
//     clientId: req.user.userId,
//     lawyerId: req.params.lawyerId,
//   })
//     .populate('bookingId', 'scheduledAt status')
//     .sort({ createdAt: -1 });

//   return sendSuccess(res, 200, { payments });
// });

// // GET /api/payments/:paymentId/invoice
// // Returns invoice data as JSON. Rendering to an actual PDF file is a
// // separate concern — feed this response into a template with pdfkit or
// // puppeteer once you're ready to generate downloadable files.
// exports.downloadInvoice = asyncHandler(async (req, res) => {
//   const payment = await Payment.findOne({
//     _id: req.params.paymentId,
//     clientId: req.user.userId,
//   })
//     .populate('lawyerId', 'specialization')
//     .populate('bookingId', 'scheduledAt durationMinutes');

//   if (!payment) {
//     throw new AppError('Payment not found.', 404);
//   }
//   if (payment.paymentStatus !== 'paid') {
//     throw new AppError('Invoice is only available for paid bookings.', 400);
//   }

//   const invoice = {
//     invoiceId: `INV-${payment._id}`,
//     date: payment.createdAt,
//     payment, // already rupee-formatted via toJSON transform
//     booking: payment.bookingId,
//     lawyer: payment.lawyerId,
//   };

//   return sendSuccess(res, 200, { invoice });
// });
