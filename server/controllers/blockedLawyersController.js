const Client = require('../models/client');
const Lawyer = require('../models/lawyer');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

// POST /api/clients/me/blocked-lawyers/:lawyerId
// Blocking hides the lawyer from this client's getLawyers results and
// prevents new bookings/conversations with them. It does NOT retroactively
// hide past bookings or delete message history.
exports.blockLawyer = asyncHandler(async (req, res) => {
  const { lawyerId } = req.params;

  const lawyer = await Lawyer.findById(lawyerId);
  if (!lawyer) {
    throw new AppError('Lawyer not found.', 404);
  }

  const client = await Client.findOneAndUpdate(
    { userId: req.user.userId },
    { $addToSet: { blockedLawyers: lawyerId }, $pull: { savedLawyers: lawyerId } },
    { new: true }
  );
  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }
  return sendSuccess(res, 200, { blockedLawyers: client.blockedLawyers });
});

// DELETE /api/clients/me/blocked-lawyers/:lawyerId
exports.unblockLawyer = asyncHandler(async (req, res) => {
  const { lawyerId } = req.params;

  const client = await Client.findOneAndUpdate(
    { userId: req.user.userId },
    { $pull: { blockedLawyers: lawyerId } },
    { new: true }
  );
  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }
  return sendSuccess(res, 200, { blockedLawyers: client.blockedLawyers });
});

// GET /api/clients/me/blocked-lawyers
exports.getBlockedLawyers = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ userId: req.user.userId }).populate({
    path: 'blockedLawyers',
    populate: { path: 'userId', select: 'name' },
  });
  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }

  const blockedLawyers = client.blockedLawyers.map((lawyer) => ({
    _id: lawyer._id,
    user: { _id: lawyer.userId._id, name: lawyer.userId.name },
    specialization: lawyer.specialization,
  }));

  return sendSuccess(res, 200, { blockedLawyers });
});