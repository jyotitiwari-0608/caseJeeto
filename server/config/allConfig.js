
/* ==========================================
   FILE: cors.js
========================================== */

// CLIENT_URLS in .env should be a comma-separated list, e.g.:
//   CLIENT_URLS=http://localhost:3000,https://caseleeto.vercel.app
// Using an explicit whitelist instead of origin: '*' matters here
// specifically because cookies/credentials (your refresh token flow, if
// you move it to an httpOnly cookie later) cannot be sent cross-origin
// with a wildcard origin — the browser blocks it outright.

const whitelist = (process.env.CLIENT_URLS || '').split(',').map((s) => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // origin is undefined for non-browser requests (curl, Postman,
    // server-to-server) — allow those through since there's no browser
    // same-origin policy to enforce for them anyway.
    if (!origin || whitelist.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin '${origin}' is not allowed by CORS.`));
  },
  credentials: true,
};

module.exports = corsOptions;



/* ==========================================
   FILE: db.js
========================================== */

const uri = process.env.MONGO_URI;
const mongoose = require('mongoose')
const connectDb = async()=>{
    try{
        const conn = await mongoose.connect(uri);
    concole.log(`connected to database`);
    }
    catch(err){
    concole.log(`not connected to database`);
    console.log(`error : ${err.message}`)
    }
}
module.exports = connectDb;



/* ==========================================
   FILE: logger.js
========================================== */

// Requires: npm install morgan
const morgan = require('morgan');

// 'dev' format is colored/concise, meant for a local terminal you're
// watching live. 'combined' is the standard Apache-style log line, better
// suited to a deployed environment's log aggregator (Render/Railway logs,
// or anything you pipe into a log service later).
//
// Skipped entirely in test env so test output isn't cluttered with every
// request line.
module.exports = () => {
  if (process.env.NODE_ENV === 'test') {
    return (req, res, next) => next(); // no-op middleware
  }
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  return morgan(format);
};



/* ==========================================
   FILE: verificationDocumentTypes.js
========================================== */

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


