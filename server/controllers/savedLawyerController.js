const Client = require('../models/client');
const Lawyer = require('../models/lawyer');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

// POST /api/clients/me/saved-lawyers/:lawyerId
exports.saveLawyer = asyncHandler(async (req, res) => {
  const { lawyerId } = req.params;

  const lawyer = await Lawyer.findById(lawyerId);
  if (!lawyer) {
    throw new AppError('Lawyer not found.', 404);
  }

  const client = await Client.findOneAndUpdate(
    { userId: req.user.userId },
    { $addToSet: { savedLawyers: lawyerId } },
    { new: true }
  );
  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }
  return sendSuccess(res, 200, { savedLawyers: client.savedLawyers });
});

// DELETE /api/clients/me/saved-lawyers/:lawyerId
exports.unsaveLawyer = asyncHandler(async (req, res) => {
  const { lawyerId } = req.params;

  const client = await Client.findOneAndUpdate(
    { userId: req.user.userId },
    { $pull: { savedLawyers: lawyerId } },
    { new: true }
  );
  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }
  return sendSuccess(res, 200, { savedLawyers: client.savedLawyers });
});

// GET /api/clients/me/saved-lawyers
// A saved lawyer whose profile has since gone private/suspended is still
// returned, but flagged `isAvailable: false` instead of silently looking
// identical to a bookable lawyer — the frontend can gray it out rather
// than showing a Book button that will 404.
exports.getSavedLawyers = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ userId: req.user.userId }).populate({
    path: 'savedLawyers',
    populate: { path: 'userId', select: 'name' },
  });
  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }

  const savedLawyers = client.savedLawyers.map((lawyer) => ({
    _id: lawyer._id,
    user: { _id: lawyer.userId._id, name: lawyer.userId.name },
    specialization: lawyer.specialization,
    consultationFee: lawyer.consultationFee,
    rating: lawyer.rating,
    isAvailable: lawyer.isProfileVisible && lawyer.verificationStatus === 'approved',
  }));

  return sendSuccess(res, 200, { savedLawyers });
});