const Client = require('../models/client');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/clients/me
exports.getMyProfile = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ userId: req.user.userId })
    .populate('userId', 'name email phone')
    .populate('savedLawyers', 'specialization consultationFee rating isProfileVisible');

  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }
  return sendSuccess(res, 200, { client });
});

// PATCH /api/clients/me
// Only bio is editable here — name/email/phone live on User and changing
// them should go through their own verification flow, not a generic PATCH.
exports.updateMyProfile = asyncHandler(async (req, res) => {
  const { bio } = req.body;

  if (bio !== undefined && bio.length > 500) {
    throw new AppError('Validation failed.', 400, [
      { field: 'bio', message: 'Must be 500 characters or fewer.' },
    ]);
  }

  const client = await Client.findOneAndUpdate(
    { userId: req.user.userId },
    { $set: { ...(bio !== undefined && { bio }) } },
    { new: true, runValidators: true }
  );

  if (!client) {
    throw new AppError('Client profile not found.', 404);
  }
  return sendSuccess(res, 200, { client });
});
