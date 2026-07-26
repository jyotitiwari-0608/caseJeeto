const mongoose = require("mongoose");

const certificateOfPracticeSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
    },

    certificateNumber: {
      type: String,
      required: true,
    },

    issueDate: Date,

    expiryDate: Date,

    certificateUrl: {
      type: String,
      required: true,
    },

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
  "CertificateOfPractice",
  certificateOfPracticeSchema
);