const mongoose = require("mongoose");

const panVerificationSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
    },

    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
    },

    panImageUrl: {
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

module.exports = mongoose.model("PanVerification", panVerificationSchema);