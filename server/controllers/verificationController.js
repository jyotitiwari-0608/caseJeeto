// verification controller.js
const Lawyer = require('../models/lawyer');
const LawyerVerification = require('../models/lawyerVerification');
const GovernmentIdVerification = require('../models/governmentVerification');
const PanVerification = require('../models/panVerification');
const BarCouncilEnrollment = require('../models/barCouncilEnrollment');
const BarCouncilId = require('../models/barCouncilId');
const CertificateOfPractice = require('../models/certificateOfPractice');
const LawDegree = require('../models/lawDegree');
const ProfessionalPhoto = require('../models/professionalPhoto');
const BankVerification = require('../models/bankVerification');
// Only the broken line needs to change — everything else in this file stays the same:
const ProfessionalExperience = require('../models/professionalExperience');

// Every simple (single-document, swap-on-resubmit) verification type maps
// to its model + the body fields a lawyer is allowed to submit. Anything
// NOT listed here (verificationStatus, verifiedBy, verifiedAt, remarks) can
// never be set by the lawyer, on any document type — only the (separate,
// admin-only) review controller may write those.
const DOCUMENT_TYPES = {
  governmentId: {
    model: GovernmentIdVerification,
    fields: ['documentType', 'documentNumber', 'fullName', 'dateOfBirth', 'issueDate', 'expiryDate', 'frontImageUrl', 'backImageUrl'],
    required: ['documentType', 'documentNumber', 'fullName', 'frontImageUrl'],
  },
  pan: {
    model: PanVerification,
    fields: ['panNumber', 'fullName', 'panImageUrl'],
    required: ['panNumber', 'fullName', 'panImageUrl'],
  },
  barCouncilEnrollment: {
    model: BarCouncilEnrollment,
    fields: ['enrollmentNumber', 'advocateName', 'stateBarCouncil', 'enrollmentDate', 'certificateUrl'],
    required: ['enrollmentNumber', 'advocateName', 'stateBarCouncil', 'enrollmentDate', 'certificateUrl'],
  },
  barCouncilId: {
    model: BarCouncilId,
    fields: ['advocateName', 'enrollmentNumber', 'stateBarCouncil', 'idCardImageUrl'],
    required: ['advocateName', 'enrollmentNumber', 'stateBarCouncil', 'idCardImageUrl'],
  },
  certificateOfPractice: {
    model: CertificateOfPractice,
    fields: ['certificateNumber', 'issueDate', 'expiryDate', 'certificateUrl'],
    required: ['certificateNumber', 'certificateUrl'],
  },
  lawDegree: {
    model: LawDegree,
    fields: ['degree', 'university', 'college', 'passingYear', 'certificateUrl'],
    required: ['degree', 'university', 'passingYear', 'certificateUrl'],
  },
  professionalPhoto: {
    model: ProfessionalPhoto,
    fields: ['photoUrl'],
    required: ['photoUrl'],
  },
  bankVerification: {
    model: BankVerification,
    fields: ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'cancelledChequeUrl', 'passbookUrl'],
    required: ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode'],
  },
};

function whitelistBody(body, allowedFields) {
  const out = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

// POST /api/lawyers/me/verification/:type
// Upsert-style submit. Blocks resubmission once a document is already
// approved — a lawyer shouldn't be able to silently edit an approved PAN
// card after the fact. Resets status to 'pending' on every (re)submission
// so admin re-reviews it, and clears any prior rejection remarks.
exports.submitDocument = async (req, res) => {
  try {
    const { type } = req.params;
    const config = DOCUMENT_TYPES[type];
    if (!config) {
      return res.status(400).json({ message: `Unknown document type '${type}'.` });
    }

    const lawyer = await Lawyer.findOne({ userId: req.user.userId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    const payload = whitelistBody(req.body, config.fields);
    const missing = config.required.filter((f) => payload[f] === undefined || payload[f] === '');
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    const existing = await config.model.findOne({ lawyerId: lawyer._id });
    if (existing && existing.verificationStatus === 'approved') {
      return res.status(403).json({
        message: 'This document is already approved and cannot be resubmitted. Contact support to correct it.',
      });
    }

    const update = {
      ...payload,
      verificationStatus: 'pending',
      verifiedBy: null,
      verifiedAt: null,
      remarks: null,
    };

    const doc = await config.model.findOneAndUpdate(
      { lawyerId: lawyer._id },
      { $set: update, $setOnInsert: { lawyerId: lawyer._id } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ document: doc });
  } catch (err) {
    return res.status(500).json({ message: 'Could not submit document.', error: err.message });
  }
};

// GET /api/lawyers/me/verification/:type
exports.getDocumentStatus = async (req, res) => {
  try {
    const { type } = req.params;
    const config = DOCUMENT_TYPES[type];
    if (!config) {
      return res.status(400).json({ message: `Unknown document type '${type}'.` });
    }

    const lawyer = await Lawyer.findOne({ userId: req.user.userId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    const doc = await config.model.findOne({ lawyerId: lawyer._id });
    return res.status(200).json({ document: doc || null });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch document status.', error: err.message });
  }
};

// POST /api/lawyers/me/verification/experience
// Kept separate from the generic handler above: ProfessionalExperience is
// an array-of-entries document (one lawyer can list several jobs), not a
// single swap-on-resubmit record, so it needs its own add/remove logic
// rather than the upsert-whole-document pattern.
exports.addExperience = async (req, res) => {
  try {
    const lawyer = await Lawyer.findOne({ userId: req.user.userId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    const {
      organizationName,
      designation,
      employmentType,
      startDate,
      endDate,
      currentlyWorking,
      experienceCertificateUrl,
    } = req.body;

    if (!organizationName || !designation || !employmentType || !startDate) {
      return res.status(400).json({
        message: 'organizationName, designation, employmentType and startDate are required.',
      });
    }

    const entry = {
      organizationName,
      designation,
      employmentType,
      startDate,
      endDate,
      currentlyWorking: !!currentlyWorking,
      experienceCertificateUrl,
      verificationStatus: 'pending',
    };

    const record = await ProfessionalExperience.findOneAndUpdate(
      { lawyerId: lawyer._id },
      {
        $push: { experiences: entry },
        $set: { overallVerificationStatus: 'pending' },
        $setOnInsert: { lawyerId: lawyer._id },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ experience: record });
  } catch (err) {
    return res.status(500).json({ message: 'Could not add experience.', error: err.message });
  }
};

// DELETE /api/lawyers/me/verification/experience/:entryId
// An already-approved entry can't be silently removed — that would erase
// part of the admin audit trail. Only pending/rejected entries can be
// deleted outright.
exports.removeExperience = async (req, res) => {
  try {
    const lawyer = await Lawyer.findOne({ userId: req.user.userId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    const record = await ProfessionalExperience.findOne({ lawyerId: lawyer._id });
    if (!record) {
      return res.status(404).json({ message: 'No experience record found.' });
    }

    const entry = record.experiences.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Experience entry not found.' });
    }
    if (entry.verificationStatus === 'approved') {
      return res.status(403).json({ message: 'Approved experience entries cannot be deleted.' });
    }

    entry.deleteOne();
    await record.save();

    return res.status(200).json({ experience: record });
  } catch (err) {
    return res.status(500).json({ message: 'Could not remove experience.', error: err.message });
  }
};

// GET /api/lawyers/me/verification/overview
// One aggregate call so the frontend can render a single checklist instead
// of firing nine-plus separate requests.
exports.getVerificationOverview = async (req, res) => {
  try {
    const lawyer = await Lawyer.findOne({ userId: req.user.userId });
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer profile not found.' });
    }

    const overallRecord = await LawyerVerification.findOne({ lawyerId: lawyer._id });

    const entries = await Promise.all(
      Object.entries(DOCUMENT_TYPES).map(async ([type, config]) => {
        const doc = await config.model
          .findOne({ lawyerId: lawyer._id })
          .select('verificationStatus remarks updatedAt');
        return [
          type,
          doc
            ? { submitted: true, status: doc.verificationStatus, remarks: doc.remarks, updatedAt: doc.updatedAt }
            : { submitted: false, status: 'not_submitted', remarks: null, updatedAt: null },
        ];
      })
    );

    const experience = await ProfessionalExperience.findOne({ lawyerId: lawyer._id }).select(
      'overallVerificationStatus experiences'
    );

    return res.status(200).json({
      overallStatus: overallRecord ? overallRecord.overallStatus : 'pending',
      documents: Object.fromEntries(entries),
      experience: experience
        ? { status: experience.overallVerificationStatus, count: experience.experiences.length }
        : { status: 'not_submitted', count: 0 },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch verification overview.', error: err.message });
  }
};
