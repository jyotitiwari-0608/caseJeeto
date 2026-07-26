const mongoose = require("mongoose");

const lawDegreeSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
    },

    degree: {
      type: String,
      enum: [
        "LL.B.",
        "B.A. LL.B.",
        "B.Com LL.B.",
        "BBA LL.B.",
        "LL.M.",
        "Other"
      ],
      required: true,
    },

    university: {
      type: String,
      required: true,
    },

    college: String,

    passingYear: {
      type: Number,
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

module.exports = mongoose.model("LawDegree", lawDegreeSchema);