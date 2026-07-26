const Review = require('../models/review');
const Booking = require('../models/booking');
const Lawyer = require('../models/lawyer');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

// Recomputes and persists a lawyer's aggregate rating/reviewCount from
// their non-deleted reviews. Called after any create/update/delete so
// `Lawyer.rating` never drifts from the actual review data.
async function recomputeLawyerRating(lawyerId) {
  const [stats] = await Review.aggregate([
    { $match: { lawyerId, isDeleted: false } },
    { $group: { _id: '$lawyerId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Lawyer.findByIdAndUpdate(lawyerId, {
    rating: stats ? Math.round(stats.avgRating * 10) / 10 : 0,
    reviewCount: stats ? stats.count : 0,
  });
}

// POST /api/reviews
// Gated: only the client who took the booking can review it, and only
// once it's actually completed. The (clientId, bookingId) unique index
// on the Review model is the hard backstop against double-submission;
// this check just gives a clean 400 instead of a raw 409 duplicate-key.
exports.createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  if (!bookingId || !rating) {
    throw new AppError('bookingId and rating are required.', 400, [
      ...(!bookingId ? [{ field: 'bookingId', message: 'Required.' }] : []),
      ...(!rating ? [{ field: 'rating', message: 'Required.' }] : []),
    ]);
  }
  if (rating < 1 || rating > 5) {
    throw new AppError('Validation failed.', 400, [
      { field: 'rating', message: 'Must be between 1 and 5.' },
    ]);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }
  if (!booking.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized to review this booking.', 403);
  }
  if (booking.status !== 'completed') {
    throw new AppError('You can only review a completed consultation.', 400);
  }

  const review = await Review.create({
    lawyerId: booking.lawyerId,
    clientId: req.user.userId,
    bookingId,
    rating,
    comment: comment || '',
  });

  await recomputeLawyerRating(booking.lawyerId);

  return sendSuccess(res, 201, { review });
});

// GET /api/reviews/lawyer/:lawyerId — public
exports.getReviewsForLawyer = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = { lawyerId: req.params.lawyerId, isDeleted: false };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Review.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, { reviews }, paginationMeta({ total, page, limit }));
});

// PATCH /api/reviews/:id
exports.updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const review = await Review.findById(req.params.id);
  if (!review || review.isDeleted) {
    throw new AppError('Review not found.', 404);
  }
  if (!review.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized to edit this review.', 403);
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new AppError('Validation failed.', 400, [
      { field: 'rating', message: 'Must be between 1 and 5.' },
    ]);
  }

  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  await review.save();

  await recomputeLawyerRating(review.lawyerId);

  return sendSuccess(res, 200, { review });
});

// DELETE /api/reviews/:id — soft delete
exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review || review.isDeleted) {
    throw new AppError('Review not found.', 404);
  }
  if (!review.clientId.equals(req.user.userId)) {
    throw new AppError('Not authorized to delete this review.', 403);
  }

  review.isDeleted = true;
  await review.save();

  await recomputeLawyerRating(review.lawyerId);

  return sendSuccess(res, 200, { message: 'Review deleted.' });
});