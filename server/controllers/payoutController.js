// payoutController.js
const Payment = require('../models/payment');

// GET /api/lawyers/me/earnings
exports.getMyEarnings = async (req, res) => {
  try {
    const lawyerId = req.user.userId;

    const totals = await Payment.aggregate([
      { $match: { lawyerId, paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$lawyerPayout' },
          totalPaidOut: {
            $sum: { $cond: [{ $eq: ['$payoutStatus', 'completed'] }, '$lawyerPayout', 0] },
          },
          totalPending: {
            $sum: { $cond: [{ $ne: ['$payoutStatus', 'completed'] }, '$lawyerPayout', 0] },
          },
          consultationCount: { $sum: 1 },
        },
      },
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = await Payment.aggregate([
      { $match: { lawyerId, paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, amount: { $sum: '$lawyerPayout' }, count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      allTime: totals[0] || { totalEarned: 0, totalPaidOut: 0, totalPending: 0, consultationCount: 0 },
      thisMonth: thisMonth[0] || { amount: 0, count: 0 },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch earnings.', error: err.message });
  }
};

// GET /api/lawyers/me/payouts?status=&page=&limit=
exports.getPayoutHistory = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { lawyerId: req.user.userId, paymentStatus: 'paid' };
    if (status) filter.payoutStatus = status;

    const payments = await Payment.find(filter)
      .populate('bookingId', 'scheduledAt')
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Payment.countDocuments(filter);

    return res.status(200).json({ payments, page: Number(page), limit: Number(limit), total });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch payout history.', error: err.message });
  }
};

// GET /api/lawyers/me/payments/booking/:bookingId
exports.getPaymentByBookingId = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      bookingId: req.params.bookingId,
      lawyerId: req.user.userId,
    });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }
    return res.status(200).json({ payment });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch payment.', error: err.message });
  }
};
