// public lawyer
// public lawyer
const Lawyer = require('../models/lawyer');
const Client = require('../models/client');
const Availability = require('../models/availibility');
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

// GET /api/lawyers/rankings?specialization=&page=&limit=
// Public leaderboard of approved, visible lawyers ranked by a transparent
// composite of client feedback and case volume:
//   - rating score   = rating / 5            (0..1)   weighted 40%
//   - volume score   = min-max normalised totalConsultations (0..1) weighted 60%
//   - overall score  = (0.4 * ratingScore + 0.6 * volumeScore) * 100  (0..100)
// Rank ties are broken by rating, then total consultations, then _id so the
// order is deterministic across pages. Pagination is applied AFTER the sort,
// so `rank` stays globally correct on every page.
exports.getLawyerRankings = asyncHandler(async (req, res) => {
  const { specialization, page = 1, limit = 50 } = req.query;
  const pageNumber = Math.max(1, Number(page) || 1);
  const limitNumber = Math.min(100, Math.max(1, Number(limit) || 50));

  const match = { isProfileVisible: true, verificationStatus: 'approved' };
  if (specialization) match.specialization = { $in: specialization.split(',') };

  const basePipeline = [
    { $match: match },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
  ];

  const [rangeResult, countResult] = await Promise.all([
    Lawyer.aggregate([
      { $match: match },
      { $group: { _id: null, min: { $min: '$totalConsultations' }, max: { $max: '$totalConsultations' } } },
    ]),
    Lawyer.aggregate([{ $match: match }, { $count: 'total' }]),
  ]);

  const total = countResult[0]?.total || 0;
  const totalPages = Math.ceil(total / limitNumber) || 0;
  const range = rangeResult[0];
  const minConsultations = range?.min ?? 0;
  const maxConsultations = range?.max ?? 0;
  const flatVolume = maxConsultations === minConsultations;

  const skip = (pageNumber - 1) * limitNumber;

  const rankingsRaw = await Lawyer.aggregate([
    ...basePipeline,
    {
      $addFields: {
        ratingScore: { $cond: [{ $gt: ['$rating', 0] }, { $divide: ['$rating', 5] }, 0] },
        volumeScore: flatVolume
          ? 0.5
          : { $divide: [{ $subtract: ['$totalConsultations', minConsultations] }, { $subtract: [maxConsultations, minConsultations] }] },
      },
    },
    {
      $addFields: {
        score: { $multiply: [{ $add: [{ $multiply: [0.4, '$ratingScore'] }, { $multiply: [0.6, '$volumeScore'] }] }, 100] },
      },
    },
    { $sort: { score: -1, rating: -1, totalConsultations: -1, _id: 1 } },
    { $skip: skip },
    { $limit: limitNumber },
    { $project: { ...LAWYER_FIELDS, 'user._id': 1, 'user.name': 1, score: 1 } },
  ]);

  const rankings = rankingsRaw.map((raw, index) => ({
    rank: skip + index + 1,
    score: Math.round(raw.score * 10) / 10,
    lawyer: formatLawyer(raw),
  }));

  return sendSuccess(res, 200, { rankings }, paginationMeta({ total, page: pageNumber, limit: limitNumber }));
});

// helper: normalize any date input to UTC midnight, matching Availability's
// own storage convention (see models/availibility.js and
// availabilityController.js, which uses the same rule on the lawyer side).
function toUtcMidnight(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('Invalid date.', 400);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// GET /api/lawyers/:id/availability?from=&to=
// Public (no auth required) — this is the client-facing read side that
// feeds booking. It intentionally returns far less than
// lawyerAvailabilityController's lawyer-self endpoint:
//   - only OPEN slots (isBooked: false)
//   - only FUTURE slots (startTime > now)
//   - never the internal slot `bookingId`
//   - only for lawyers who are actually bookable (visible + approved)
// The `availabilityId` and `slotId` returned here are exactly the values
// bookingController.createBooking expects in its request body.
exports.getLawyerAvailability = asyncHandler(async (req, res) => {
  const lawyer = await Lawyer.findOne({
    _id: req.params.id,
    isProfileVisible: true,
    verificationStatus: 'approved',
  });
  if (!lawyer) {
    throw new AppError('Lawyer not found.', 404);
  }

  const { from, to } = req.query;
  const fromDate = from ? toUtcMidnight(from) : toUtcMidnight(new Date());
  const filter = { lawyerId: lawyer._id, date: { $gte: fromDate } };
  if (to) {
    const toDate = toUtcMidnight(to);
    if (toDate < fromDate) {
      throw new AppError('to must be on or after from.', 400);
    }
    filter.date.$lte = toDate;
  }

  const availabilityDocs = await Availability.find(filter).sort({ date: 1 }).lean();
  const now = new Date();

  const availability = availabilityDocs
    .map((doc) => ({
      availabilityId: doc._id,
      date: doc.date,
      slots: doc.slots
        .filter((slot) => !slot.isBooked && new Date(slot.startTime) > now)
        .map((slot) => ({ slotId: slot._id, startTime: slot.startTime, endTime: slot.endTime })),
    }))
    .filter((day) => day.slots.length > 0);

  return sendSuccess(res, 200, { availability });
});
// const Lawyer = require('../models/lawyer');
// const Client = require('../models/client');
// const asyncHandler = require('../middleware/asyncHandler');
// const AppError = require('../utils/AppError');
// const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

// // Single shape used by BOTH getLawyers and getLawyerById, so the frontend
// // can use one parser for list and detail views. `user` is always
// // { _id, name } at minimum, never `userId`, never nested differently.
// const LAWYER_FIELDS = {
//   specialization: 1,
//   yearsOfExperience: 1,
//   courtsPracticed: 1,
//   languages: 1,
//   consultationFee: 1,
//   bio: 1,
//   profilePhoto: 1,
//   officeAddress: 1,
//   rating: 1,
//   reviewCount: 1,
//   totalConsultations: 1,
// };

// function formatLawyer(raw) {
//   return {
//     _id: raw._id,
//     user: { _id: raw.user._id, name: raw.user.name },
//     specialization: raw.specialization,
//     yearsOfExperience: raw.yearsOfExperience,
//     courtsPracticed: raw.courtsPracticed,
//     languages: raw.languages,
//     consultationFee: raw.consultationFee,
//     bio: raw.bio,
//     profilePhoto: raw.profilePhoto,
//     officeAddress: raw.officeAddress,
//     rating: raw.rating,
//     reviewCount: raw.reviewCount,
//     totalConsultations: raw.totalConsultations,
//   };
// }

// // GET /api/lawyers
// exports.getLawyers = asyncHandler(async (req, res) => {
//   const {
//     specialization,
//     court,
//     language,
//     minFee,
//     maxFee,
//     minExperience,
//     minRating,
//     name,
//     sortBy = 'rating',
//     order = 'desc',
//     page = 1,
//     limit = 20,
//   } = req.query;

//   const match = { isProfileVisible: true, verificationStatus: 'approved' };
//   if (req.user?.role === 'client') {
//     const client = await Client.findOne({ userId: req.user.userId }).select('blockedLawyers');
//     if (client?.blockedLawyers?.length) {
//       match._id = { $nin: client.blockedLawyers };
//     }
//   }
//   if (specialization) match.specialization = { $in: specialization.split(',') };
//   if (court) match.courtsPracticed = { $in: court.split(',') };
//   if (language) match.languages = { $in: language.split(',') };
//   if (minFee || maxFee) {
//     match.consultationFee = {};
//     if (minFee) match.consultationFee.$gte = Number(minFee);
//     if (maxFee) match.consultationFee.$lte = Number(maxFee);
//   }
//   if (minExperience) match.yearsOfExperience = { $gte: Number(minExperience) };
//   if (minRating) match.rating = { $gte: Number(minRating) };

//   const sortFieldMap = {
//     rating: 'rating',
//     fee: 'consultationFee',
//     experience: 'yearsOfExperience',
//     consultations: 'totalConsultations',
//   };
//   const sortField = sortFieldMap[sortBy] || 'rating';
//   const sortOrder = order === 'asc' ? 1 : -1;
//   const skip = (Number(page) - 1) * Number(limit);

//   const basePipeline = [
//     { $match: match },
//     { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
//     { $unwind: '$user' },
//     ...(name ? [{ $match: { 'user.name': { $regex: name, $options: 'i' } } }] : []),
//   ];

//   const [lawyersRaw, countResult] = await Promise.all([
//     Lawyer.aggregate([
//       ...basePipeline,
//       { $sort: { [sortField]: sortOrder } },
//       { $skip: skip },
//       { $limit: Number(limit) },
//       { $project: { ...LAWYER_FIELDS, 'user._id': 1, 'user.name': 1 } },
//     ]),
//     Lawyer.aggregate([...basePipeline, { $count: 'total' }]),
//   ]);

//   const total = countResult[0]?.total || 0;
//   const lawyers = lawyersRaw.map(formatLawyer);

//   return sendSuccess(res, 200, { lawyers }, paginationMeta({ total, page, limit }));
// });

// // GET /api/lawyers/:id
// exports.getLawyerById = asyncHandler(async (req, res) => {
//   const lawyer = await Lawyer.findOne({
//     _id: req.params.id,
//     isProfileVisible: true,
//     verificationStatus: 'approved',
//   })
//     .populate('userId', 'name')
//     .lean();

//   if (!lawyer) {
//     throw new AppError('Lawyer not found.', 404);
//   }

//   const formatted = formatLawyer({ ...lawyer, user: lawyer.userId });

//   let isSaved = false;
//   let isBlocked = false;
//   if (req.user) {
//     const client = await Client.findOne({ userId: req.user.userId });
//     if (client) {
//       isSaved = client.savedLawyers.some((id) => id.equals(lawyer._id));
//       isBlocked = client.blockedLawyers.some((id) => id.equals(lawyer._id));
//     }
//   }

//   return sendSuccess(res, 200, { lawyer: formatted, isSaved, isBlocked });
// });
