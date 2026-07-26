//type , ref , required , trim , minlenght , maxlength , default , enum , unique , lowercase
const mongoose = require("mongoose");

const lawyerVerificationSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
      unique: true,
    },

    overallStatus: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "suspended",
      ],
      default: "pending",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: Date,

    rejectionReason: String,

    adminRemarks: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "LawyerVerification",
  lawyerVerificationSchema
);