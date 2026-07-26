const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
    },

    employmentType: {
      type: String,
      enum: [
        "Law Firm",
        "Independent Practice",
        "Internship",
        "Chamber",
        "Corporate Legal",
        "Government",
        "Other",
      ],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: Date,

    currentlyWorking: {
      type: Boolean,
      default: false,
    },

    experienceCertificateUrl: String,

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    remarks: String,
  },
  {
    _id: true,
  }
);

const professionalExperienceSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
      unique: true,
    },

    experiences: [experienceSchema],

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: Date,

    overallVerificationStatus: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'ProfessionalExperience',
  professionalExperienceSchema
);