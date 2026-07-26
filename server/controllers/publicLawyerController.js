// public lawyer
const Lawyer = require('../models/lawyer');
const Client = require('../models/client');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

// Single shape used by BOTH getLawyers and getLawyerById, so the frontend
// can use one parser for list and detail views. `user` is always
// { _id, name } at minimum, never `userId`, never nested differently.
const LAWYER_FIELDS = {
  specialization: 1,
  yearsOfExperience: 1,
  courtsPracticed: 1,
  languages: 1,
  consultationFee: 1,
  bio: 1,
  profilePhoto: 1,
  officeAddress: 1,
  rating: 1,
  reviewCount: 1,
  totalConsultations: 1,
};

function formatLawyer(raw) {
  return {
    _id: raw._id,
    user: { _id: raw.user._id, name: raw.user.name },
    specialization: raw.specialization,
    yearsOfExperience: raw.yearsOfExperience,
    courtsPracticed: raw.courtsPracticed,
    languages: raw.languages,
    consultationFee: raw.consultationFee,
    bio: raw.bio,
    profilePhoto: raw.profilePhoto,
    officeAddress: raw.officeAddress,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    totalConsultations: raw.totalConsultations,
  };
}

// GET /api/lawyers
exports.getLawyers = asyncHandler(async (req, res) => {
  const {
    specialization,
    court,
    language,
    minFee,
    maxFee,
    minExperience,
    minRating,
    name,
    sortBy = 'rating',
    order = 'desc',
    page = 1,
    limit = 20,
  } = req.query;

  const match = { isProfileVisible: true, verificationStatus: 'approved' };
  if (req.user?.role === 'client') {
    const client = await Client.findOne({ userId: req.user.userId }).select('blockedLawyers');
    if (client?.blockedLawyers?.length) {
      match._id = { $nin: client.blockedLawyers };
    }
  }
  if (specialization) match.specialization = { $in: specialization.split(',') };
  if (court) match.courtsPracticed = { $in: court.split(',') };
  if (language) match.languages = { $in: language.split(',') };
  if (minFee || maxFee) {
    match.consultationFee = {};
    if (minFee) match.consultationFee.$gte = Number(minFee);
    if (maxFee) match.consultationFee.$lte = Number(maxFee);
  }
  if (minExperience) match.yearsOfExperience = { $gte: Number(minExperience) };
  if (minRating) match.rating = { $gte: Number(minRating) };

  const sortFieldMap = {
    rating: 'rating',
    fee: 'consultationFee',
    experience: 'yearsOfExperience',
    consultations: 'totalConsultations',
  };
  const sortField = sortFieldMap[sortBy] || 'rating';
  const sortOrder = order === 'asc' ? 1 : -1;
  const skip = (Number(page) - 1) * Number(limit);

  const basePipeline = [
    { $match: match },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    ...(name ? [{ $match: { 'user.name': { $regex: name, $options: 'i' } } }] : []),
  ];

  const [lawyersRaw, countResult] = await Promise.all([
    Lawyer.aggregate([
      ...basePipeline,
      { $sort: { [sortField]: sortOrder } },
      { $skip: skip },
      { $limit: Number(limit) },
      { $project: { ...LAWYER_FIELDS, 'user._id': 1, 'user.name': 1 } },
    ]),
    Lawyer.aggregate([...basePipeline, { $count: 'total' }]),
  ]);

  const total = countResult[0]?.total || 0;
  const lawyers = lawyersRaw.map(formatLawyer);

  return sendSuccess(res, 200, { lawyers }, paginationMeta({ total, page, limit }));
});

// GET /api/lawyers/:id
exports.getLawyerById = asyncHandler(async (req, res) => {
  const lawyer = await Lawyer.findOne({
    _id: req.params.id,
    isProfileVisible: true,
    verificationStatus: 'approved',
  })
    .populate('userId', 'name')
    .lean();

  if (!lawyer) {
    throw new AppError('Lawyer not found.', 404);
  }

  const formatted = formatLawyer({ ...lawyer, user: lawyer.userId });

  let isSaved = false;
  let isBlocked = false;
  if (req.user) {
    const client = await Client.findOne({ userId: req.user.userId });
    if (client) {
      isSaved = client.savedLawyers.some((id) => id.equals(lawyer._id));
      isBlocked = client.blockedLawyers.some((id) => id.equals(lawyer._id));
    }
  }

  return sendSuccess(res, 200, { lawyer: formatted, isSaved, isBlocked });
});
