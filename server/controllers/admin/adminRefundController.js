const Refund = require('../../models/refund');
const Payment = require('../../models/payment');

const REVIEWABLE_STATUSES = ['requested', 'under_review'];

// GET /api/admin/refunds?status=&page=&limit=
exports.getRefunds = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.refundStatus = status;

    const refunds = await Refund.find(filter)
      .populate('clientId', 'name email')
      .populate('lawyerId', 'name email')
      .populate('bookingId', 'scheduledAt status')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Refund.countDocuments(filter);

    return res.status(200).json({ refunds, page: Number(page), limit: Number(limit), total });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch refunds.', error: err.message });
  }
};

// GET /api/admin/refunds/:id
exports.getRefundById = async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('lawyerId', 'name email')
      .populate('bookingId')
      .populate('paymentId');

    if (!refund) {
      return res.status(404).json({ message: 'Refund not found.' });
    }
    return res.status(200).json({ refund });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch refund.', error: err.message });
  }
};

// PATCH /api/admin/refunds/:id/review
// body: { action: 'approve' | 'reject', evidence, failureReason }
// This only records the admin DECISION — it does not itself call
// Razorpay. Actually moving the money is a separate step
// (processRefundPayment below), kept apart deliberately so "approved in
// our system" and "money actually sent back" can never be conflated, the
// same way payment creation and payment verification are already split
// in paymentController.
exports.reviewRefund = async (req, res) => {
  try {
    const { action, evidence, failureReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: "action must be 'approve' or 'reject'." });
    }

    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ message: 'Refund not found.' });
    }
    if (!REVIEWABLE_STATUSES.includes(refund.refundStatus)) {
      return res.status(409).json({
        message: `Refund is currently '${refund.refundStatus}' and is not awaiting review.`,
      });
    }

    if (action === 'approve') {
      if (!evidence && !refund.reasonVerification?.evidence) {
        return res.status(400).json({ message: 'evidence is required to approve a refund.' });
      }
      refund.refundStatus = 'approved';
      refund.approvedBy = req.user.userId;
      refund.approvedAt = new Date();
      if (evidence) refund.reasonVerification.evidence = evidence;
      refund.reasonVerification.verifiedBy = req.user.userId;
      refund.reasonVerification.verifiedAt = new Date();
    } else {
      refund.refundStatus = 'rejected';
      refund.failureReason = failureReason || 'Rejected by admin.';
    }

    await refund.save();
    return res.status(200).json({ refund });
  } catch (err) {
    return res.status(500).json({ message: 'Could not review refund.', error: err.message });
  }
};

// PATCH /api/admin/refunds/:id/mark-processed
// Interim manual step until the Phase 9 webhook handler exists: once an
// admin has actually triggered the refund through the Razorpay dashboard
// (or a razorpay.payments.refund() call once that's wired up), this
// records the result on both Refund and the parent Payment. Once the
// webhook exists, refund.processed events should call this same update
// logic instead of relying on an admin doing it by hand every time.
exports.markProcessed = async (req, res) => {
  try {
    const { razorpayRefundId, refundedAmount } = req.body;

    if (!razorpayRefundId) {
      return res.status(400).json({ message: 'razorpayRefundId is required.' });
    }

    const refund = await Refund.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ message: 'Refund not found.' });
    }
    if (refund.refundStatus !== 'approved') {
      return res.status(409).json({ message: `Refund must be 'approved' before it can be marked processed.` });
    }

    refund.refundStatus = 'completed';
    refund.razorpayRefundId = razorpayRefundId;
    refund.refundedAt = new Date();
    await refund.save();

    await Payment.findByIdAndUpdate(refund.paymentId, {
      paymentStatus: 'refunded',
      refundAmount: refundedAmount || refund.refundAmount,
      refundReason: refund.refundReason,
      refundedAt: new Date(),
      razorpayRefundId,
    });

    return res.status(200).json({ refund });
  } catch (err) {
    return res.status(500).json({ message: 'Could not mark refund processed.', error: err.message });
  }
};
