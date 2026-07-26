const mongoose = require("mongoose");

const barCouncilIdSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
    },

    advocateName: {
      type: String,
      required: true,
    },

    enrollmentNumber: {
      type: String,
      required: true,
    },

    stateBarCouncil: {
      type: String,
      required: true,
    },

    idCardImageUrl: {
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

module.exports = mongoose.model("BarCouncilId", barCouncilIdSchema);