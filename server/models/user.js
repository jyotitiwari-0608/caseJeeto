// //type , ref , required , trim , minlenght , maxlength , default , enum , unique , lowercase
//     //name , email , hashedpw , refreshToken, role , verification document - aadhar card + lawyer degree +Bar Council Enrollment Certificate+Bar Council ID Card , age, vo lawyer supreme court wla h ya high ya lower , verified or not
//     // signed agreements of lawyersand clients
//     //lawyers have to pay platform fees , 15% of total consultationfees received by all clients 
//     const mongoose = require("mongoose");

//     const userSchema = new mongoose.Schema(
//       {
//         role: {
//           type: String,
//           enum: ["client", "lawyer", "admin"],
//           required: true,
//         },
    
//         name: {
//           type: String,
//           required: true,
//           trim: true,
//         },
    
//         email: {
//           type: String,
//           required: true,
//           unique: true,
//           lowercase: true,
//           trim: true,
//         },
    
//         phone: {
//           type: String,
//           required: true,
//           unique: true,
//           trim: true,
//         },
    
//         passwordHash: {
//           type: String,
//           required: true,
//           select: false,
//         },
    
//         isEmailVerified: {
//           type: Boolean,
//           default: false,
//         },
    
//         isPhoneVerified: {
//           type: Boolean,
//           default: false,
//         },
    
//         isActive: {
//           type: Boolean,
//           default: true,
//         },
    
//         lastLogin: Date,
//         refreshToken:{
//             type : String , 
//             default : null
//         }
//       },
//       {
//         timestamps: true,
//       }
//     );
    
//     module.exports = mongoose.model("User", userSchema);

// /**
//  * Since you're building **CaseLeeto** for India (using Razorpay, etc.), you should verify lawyers at **three levels**:

// 1. **Identity** (Is this person who they claim to be?)
// 2. **Professional Qualification** (Are they actually licensed to practice law?)
// 3. **Payout Compliance** (Can you legally pay them?)

// A production marketplace typically doesn't rely on a single document like a law degree because a law degree alone **does not authorize someone to practice law**.

// ## 1. Government Identity (Required)

// These establish the person's identity.

// * Aadhaar Card (or another government-issued ID)
// * PAN Card (important for tax and payouts)
// * Passport (optional alternative)
// * Driving Licence (optional alternative)

// Store:

// ```text
// Document Type
// Document Number
// Front Image
// Back Image (if applicable)
// Verification Status
// Verified By
// Verified At
// ```

// ---

// ## 2. Professional Verification (Most Important)

// These prove the person is legally allowed to practice.

// ### Bar Council Enrollment Certificate (Required)

// This is far more important than the law degree.

// Contains:

// * Enrollment Number
// * Advocate Name
// * State Bar Council
// * Date of Enrollment

// Example:

// ```text
// Enrollment Number:
// D/1234/2020

// Bar Council:
// Delhi Bar Council
// ```

// ---

// ### Certificate of Practice (COP) (Recommended)

// Some advocates possess a Certificate of Practice issued under Bar Council regulations.

// This helps verify that the advocate is actively entitled to practice.

// ---

// ### Bar Council ID Card (Recommended)

// Many State Bar Councils issue an Advocate Identity Card.

// Useful because it contains:

// * Photograph
// * Enrollment Number
// * Name
// * State Bar Council

// ---

// ### Law Degree (LL.B.) (Optional but Recommended)

// Examples:

// * LL.B.
// * B.A. LL.B.
// * B.Com LL.B.
// * LL.M. (optional)

// This confirms academic qualifications but **does not by itself authorize legal practice**.

// ---

// ## 3. Experience Verification (Optional)

// These aren't required for onboarding but help build trust.

// Examples:

// * Chamber/firm experience letters
// * Previous employment letters
// * Internship certificates
// * Court appointment letters

// ---

// ## 4. Practice Information

// Ask the lawyer to provide:

// * Years of experience
// * Primary practice areas
// * Courts they appear before
// * Languages spoken
// * Office address

// ---

// ## 5. Profile Photo

// A clear professional headshot.

// Avoid:

// * Group photos
// * Selfies
// * Blurry images

// ---

// ## 6. Bank Verification (For Razorpay Route)

// Since lawyers receive payouts:

// * Bank Account Number
// * IFSC Code
// * Cancelled Cheque or Bank Passbook (optional but useful)
// * Account Holder Name

// Razorpay may also require Know Your Customer (KYC) details depending on the account type and regulatory requirements.

// ---

// # Database Design

// Instead of adding many document fields directly to the `Lawyer` model, keep them in a separate collection.

// ```javascript
// LawyerVerification

// {
//   _id,

//   lawyerId,

//   documents: [

//     {
//       type: "aadhaar",

//       fileUrl,

//       status: "approved",

//       verifiedAt
//     },

//     {
//       type: "pan",

//       fileUrl,

//       status: "approved"
//     },

//     {
//       type: "bar_enrollment",

//       enrollmentNumber,

//       stateBarCouncil,

//       fileUrl,

//       status: "approved"
//     },

//     {
//       type: "law_degree",

//       university,

//       year,

//       fileUrl,

//       status: "approved"
//     }

//   ],

//   overallStatus: "pending",

//   verifiedBy,

//   remarks
// }
// ```

// This is much easier to extend later if you add new document types.

// ---

// # Verification Workflow

// ```text
// Lawyer Registers
//         │
//         ▼
// Uploads Required Documents
//         │
//         ▼
// Admin Reviews Documents
//         │
//    ┌────┴────┐
//    │         │
// Approved   Rejected
//    │         │
//    ▼         ▼
// Verified  Lawyer uploads corrected documents
// ```

// Until verification is complete:

// * Lawyer cannot receive bookings.
// * Lawyer does not appear in public search results.
// * Lawyer cannot receive payouts.

// ---

// # Recommended Required Documents for CaseLeeto

// | Document                                | Required                 | Purpose                                       |
// | --------------------------------------- | ------------------------ | --------------------------------------------- |
// | Government ID (Aadhaar/Passport/etc.)   | ✅                        | Identity verification                         |
// | PAN Card                                | ✅                        | Tax and payout verification                   |
// | Bar Council Enrollment Certificate      | ✅                        | Confirms the advocate is enrolled to practice |
// | Bar Council ID Card (if available)      | ✅ Recommended            | Additional professional verification          |
// | Law Degree (LL.B./Integrated LL.B.)     | ✅ Recommended            | Academic qualification                        |
// | Professional Photo                      | ✅                        | Marketplace profile                           |
// | Bank Details                            | ✅                        | Razorpay Route payouts                        |
// | Certificate of Practice (if applicable) | Optional but recommended | Evidence of active practice                   |
// | Experience/Employment Documents         | Optional                 | Enhances credibility                          |

// For a marketplace like CaseLeeto, the **Bar Council Enrollment Certificate** is the single most important professional document. A person may have an LL.B. degree but still not be authorized to practice law unless they are properly enrolled with a State Bar Council. Your verification process should therefore prioritize **Bar Council enrollment** over academic qualifications.

//  */


const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["client", "lawyer", "admin"], required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,

    // CHANGED: was a single `refreshToken` field, which meant logging in
    // from a second device silently logged the first one out. Now stores
    // one hashed entry per active session so mobile + web can coexist.
    // Store a HASH of the refresh token (never the raw token) so a DB leak
    // doesn't hand out valid tokens directly.
    refreshTokens: [
      {
        tokenHash: { type: String, required: true, select: false },
        device: { type: String, default: 'unknown' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);