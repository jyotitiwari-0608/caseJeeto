// This is the document locker
// Purpose : Stores every document lawyer uploads.

const mongoose = require("mongoose");

const governmentIdVerificationSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
    },

    documentType: {
      type: String,
      enum: [
        "AADHAAR",
        "PASSPORT",
        "DRIVING_LICENSE",
        "VOTER_ID"
      ],
      required: true,
    },

    documentNumber: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: Date,

    issueDate: Date,

    expiryDate: Date,

    frontImageUrl: {
      type: String,
      required: true,
    },

    backImageUrl: String,

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: Date,

    remarks: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "GovernmentIdVerification",
  governmentIdVerificationSchema
);