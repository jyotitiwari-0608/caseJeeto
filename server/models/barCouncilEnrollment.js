const mongoose = require("mongoose");

const barCouncilEnrollmentSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
    },

    enrollmentNumber: {
      type: String,
      required: true,
    },

    advocateName: {
      type: String,
      required: true,
    },

    stateBarCouncil: {
      type: String,
      required: true,
    },

    enrollmentDate: {
      type: Date,
      required: true,
    },

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
  "BarCouncilEnrollment",
  barCouncilEnrollmentSchema
);