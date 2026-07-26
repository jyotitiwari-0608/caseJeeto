const GovernmentIdVerification = require('../models/governmentVerification');
const PanVerification = require('../models/panVerification');
const BarCouncilEnrollment = require('../models/barCouncilEnrollment');
const BarCouncilId = require('../models/barCouncilId');
const CertificateOfPractice = require('../models/certificateOfPractice');
const LawDegree = require('../models/lawDegree');
const ProfessionalPhoto = require('../models/professionalPhoto');
const BankVerification = require('../models/bankVerification');

// Single source of truth for the nine simple (non-array) verification
// document types. Previously duplicated inline inside
// controllers/verificationController.js — import DOCUMENT_TYPES from here
// in that file instead, so the lawyer-submit side and the admin-review
// side can never drift out of sync.
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

// The subset of document types that MUST be approved before a lawyer's
// overall verification can become 'approved' and their profile can go
// visible. Matches the "Required" column from the CaseLeeto verification
// plan: barCouncilId, lawDegree and certificateOfPractice are recommended
// but not blocking; professionalExperience is optional and handled
// separately since it's array-based, not a single document.
const REQUIRED_FOR_APPROVAL = ['governmentId', 'pan', 'barCouncilEnrollment', 'professionalPhoto', 'bankVerification'];

module.exports = { DOCUMENT_TYPES, REQUIRED_FOR_APPROVAL };