// NOTE: assumes a Review model (flagged as a real schema gap earlier,
// not yet created): { lawyerId, clientId, bookingId, rating, comment,
// createdAt }, with a unique index on (clientId, bookingId).

const Review = require('../models/review');
const Lawyer = require('../models/lawyer');

// GET /api/lawyers/me/reviews?page=&limit=
// Read-only by design — a lawyer can view but never edit or delete a
// client's review.
exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const lawyer = await Lawyer.findOne({ userId: req.user.userId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    const reviews = await Review.find({ lawyerId: lawyer._id })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Review.countDocuments({ lawyerId: lawyer._id });

    return res.status(200).json({ reviews, page: Number(page), limit: Number(limit), total });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch reviews.', error: err.message });
  }
};
