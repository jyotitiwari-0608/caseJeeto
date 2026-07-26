const mongoose = require("mongoose");

const professionalPhotoSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
      unique: true,
    },

    photoUrl: {
      type: String,
      required: true,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    remarks: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ProfessionalPhoto",
  professionalPhotoSchema
);