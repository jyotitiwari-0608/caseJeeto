const Lawyer = require('../models/lawyer');
const LawyerVerification = require('../models/lawyerVerification');
const ProfessionalExperience = require('../models/professionalExperience');
const { DOCUMENT_TYPES, REQUIRED_FOR_APPROVAL } = require('../config/verificationDocumentTypes');

// Re-derives the lawyer's overall verification status from the current
// state of every individual document, and keeps Lawyer.verificationStatus
// in sync so search/visibility checks elsewhere never read a stale value.
// Called after every single document approval/rejection rather than
// trusted to be set by hand alongside each one.
async function recomputeOverallStatus(lawyerId) {
  const results = await Promise.all(
    REQUIRED_FOR_APPROVAL.map((type) =>
      DOCUMENT_TYPES[type].model.findOne({ lawyerId }).select('verificationStatus')
    )
  );

  const statuses = results.map((doc) => (doc ? doc.verificationStatus : 'not_submitted'));

  let overallStatus;
  if (statuses.some((s) => s === 'rejected')) {
    overallStatus = 'rejected';
  } else if (statuses.every((s) => s === 'approved')) {
    overallStatus = 'approved';
  } else if (statuses.some((s) => s === 'pending' || s === 'approved')) {
    overallStatus = 'under_review';
  } else {
    overallStatus = 'pending';
  }

  await LawyerVerification.findOneAndUpdate(
    { lawyerId },
    { $set: { overallStatus }, $setOnInsert: { lawyerId } },
    { upsert: true }
  );

  // Keep Lawyer.verificationStatus (used directly by getLawyers'
  // { verificationStatus: 'approved' } filter) in lockstep. 'suspended' is
  // a separate admin action, not derived here, so it's deliberately never
  // written by this function.
  await Lawyer.findByIdAndUpdate(lawyerId, { verificationStatus: overallStatus });

  // If a lawyer was visible and their verification just got rejected
  // (e.g. after a later re-review), pull them out of search results
  // immediately rather than waiting for them to notice and re-toggle.
  if (overallStatus !== 'approved') {
    await Lawyer.findByIdAndUpdate(lawyerId, { isProfileVisible: false });
  }

  return overallStatus;
}

// PATCH /api/admin/verification/:lawyerId/:type
// body: { status: 'approved' | 'rejected', remarks }
exports.reviewDocument = async (req, res) => {
  try {
    const { lawyerId, type } = req.params;
    const { status, remarks } = req.body;

    const config = DOCUMENT_TYPES[type];
    if (!config) {
      return res.status(400).json({ message: `Unknown document type '${type}'.` });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'." });
    }
    if (status === 'rejected' && !remarks) {
      return res.status(400).json({ message: 'remarks is required when rejecting a document.' });
    }

    const doc = await config.model.findOne({ lawyerId });
    if (!doc) {
      return res.status(404).json({ message: 'No submitted document found for this lawyer.' });
    }
    if (doc.verificationStatus !== 'pending') {
      return res.status(409).json({
        message: `This document is currently '${doc.verificationStatus}', not pending review.`,
      });
    }

    doc.verificationStatus = status;
    doc.verifiedBy = req.user.userId;
    doc.verifiedAt = new Date();
    doc.remarks = remarks || null;
    await doc.save();

    const overallStatus = await recomputeOverallStatus(lawyerId);

    return res.status(200).json({ document: doc, overallStatus });
  } catch (err) {
    return res.status(500).json({ message: 'Could not review document.', error: err.message });
  }
};

// PATCH /api/admin/verification/:lawyerId/experience/:entryId
// Experience entries live in an array, so they're reviewed one at a time
// by their own _id rather than through the generic :type handler above.
exports.reviewExperienceEntry = async (req, res) => {
  try {
    const { lawyerId, entryId } = req.params;
    const { status, remarks } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'." });
    }

    const record = await ProfessionalExperience.findOne({ lawyerId });
    if (!record) {
      return res.status(404).json({ message: 'No experience record found for this lawyer.' });
    }

    const entry = record.experiences.id(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Experience entry not found.' });
    }

    entry.verificationStatus = status;
    entry.remarks = remarks || null;

    // Experience is optional/supplementary (see REQUIRED_FOR_APPROVAL), so
    // its overall status is informational only and never blocks or drives
    // recomputeOverallStatus above.
    record.overallVerificationStatus = record.experiences.some((e) => e.verificationStatus === 'rejected')
      ? 'rejected'
      : record.experiences.every((e) => e.verificationStatus === 'approved')
      ? 'approved'
      : 'pending';
    record.verifiedBy = req.user.userId;
    record.verifiedAt = new Date();

    await record.save();
    return res.status(200).json({ experience: record });
  } catch (err) {
    return res.status(500).json({ message: 'Could not review experience entry.', error: err.message });
  }
};

// GET /api/admin/verification/pending/:type?page=&limit=
// Review queue for one document type at a time — deliberately not "all
// pending docs across all types in one list" since each type has a
// different shape and an admin reviewing PAN cards wants that queue, not
// interleaved with bar council certificates.
exports.getPendingDocuments = async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const config = DOCUMENT_TYPES[type];
    if (!config) {
      return res.status(400).json({ message: `Unknown document type '${type}'.` });
    }

    const docs = await config.model
      .find({ verificationStatus: 'pending' })
      .populate({ path: 'lawyerId', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: 1 }) // oldest submissions reviewed first
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await config.model.countDocuments({ verificationStatus: 'pending' });

    return res.status(200).json({ documents: docs, page: Number(page), limit: Number(limit), total });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch pending documents.', error: err.message });
  }
};

// GET /api/admin/verification/:lawyerId
// Full detail dump for one lawyer's entire verification file — the admin
// review screen for a single applicant, showing every document's actual
// submitted data (not just status, unlike the lawyer's own overview
// endpoint) so the admin can compare e.g. the name on the PAN card against
// the name on the government ID.
exports.getLawyerVerificationDetail = async (req, res) => {
  try {
    const { lawyerId } = req.params;

    const lawyer = await Lawyer.findById(lawyerId).populate('userId', 'name email phone');
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found.' });
    }

    const overallRecord = await LawyerVerification.findOne({ lawyerId });

    const entries = await Promise.all(
      Object.entries(DOCUMENT_TYPES).map(async ([type, config]) => {
        const doc = await config.model.findOne({ lawyerId });
        return [type, doc];
      })
    );

    const experience = await ProfessionalExperience.findOne({ lawyerId });

    return res.status(200).json({
      lawyer,
      overallStatus: overallRecord ? overallRecord.overallStatus : 'pending',
      documents: Object.fromEntries(entries),
      experience: experience || null,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch verification detail.', error: err.message });
  }
};

// PATCH /api/admin/verification/:lawyerId/suspend
// Separate from the approve/reject flow above — suspension can happen to
// an already-approved lawyer (e.g. a complaint comes in later) and must
// immediately pull them out of search regardless of document status.
exports.suspendLawyer = async (req, res) => {
  try {
    const { lawyerId } = req.params;
    const { remarks } = req.body;

    const lawyer = await Lawyer.findByIdAndUpdate(
      lawyerId,
      { verificationStatus: 'suspended', isProfileVisible: false },
      { new: true }
    );
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found.' });
    }

    await LawyerVerification.findOneAndUpdate(
      { lawyerId },
      { $set: { overallStatus: 'suspended', adminRemarks: remarks || null, verifiedBy: req.user.userId, verifiedAt: new Date() } },
      { upsert: true }
    );

    return res.status(200).json({ lawyer });
  } catch (err) {
    return res.status(500).json({ message: 'Could not suspend lawyer.', error: err.message });
  }
};
