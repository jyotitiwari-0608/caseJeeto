const Lawyer = require('../models/lawyer');
const Booking = require('../models/booking');
const Payment = require('../models/payment');
const Conversation = require('../models/conversation');
const LawyerVerification = require('../models/lawyerVerification');

// GET /api/lawyers/me/dashboard
// One aggregate call bundling the numbers a dashboard landing page needs,
// instead of five separate frontend requests.
exports.getDashboardSummary = async (req, res) => {
  try {
    const lawyerUserId = req.user.userId;
    const lawyer = await Lawyer.findOne({ userId: lawyerUserId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    const now = new Date();

    const [upcomingCount, monthlyEarnings, verification, conversations] = await Promise.all([
      Booking.countDocuments({
        lawyerId: lawyerUserId,
        status: 'confirmed',
        scheduledAt: { $gte: now },
      }),
      Payment.aggregate([
        {
          $match: {
            lawyerId: lawyerUserId,
            paymentStatus: 'paid',
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
          },
        },
        { $group: { _id: null, amount: { $sum: '$lawyerPayout' } } },
      ]),
      LawyerVerification.findOne({ lawyerId: lawyer._id }).select('overallStatus'),
      Conversation.find({ lawyerId: lawyerUserId }).select('messages'),
    ]);

    const unreadMessages = conversations.reduce(
      (sum, c) => sum + c.messages.filter((m) => !m.readBy.some((id) => id.equals(lawyerUserId))).length,
      0
    );

    return res.status(200).json({
      upcomingBookings: upcomingCount,
      earningsThisMonth: monthlyEarnings[0]?.amount || 0,
      rating: lawyer.rating,
      reviewCount: lawyer.reviewCount,
      verificationStatus: verification ? verification.overallStatus : 'pending',
      unreadMessages,
      isProfileVisible: lawyer.isProfileVisible,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch dashboard summary.', error: err.message });
  }
};
