// everything the client can see about lawyer 
// experience , courtsPracticed , userId , specialization , language , fees , office address , bio , profile photo , verificatoinStatus , isProfileVisible, rating , review count , totalConsultations , razorpayaccountid,rank
const mongoose = require("mongoose");

const lawyerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    specialization: [
      {
        type: String,
        required: true,
      },
    ],

    yearsOfExperience: {
      type: Number,
      required: true,
      min: 0,
    },

    courtsPracticed: [
      {
        type: String,
      },
    ],

    languages: [
      {
        type: String,
      },
    ],

    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },

    bio: {
      type: String,
      maxlength: 1500,
    },

    officeAddress: {
      type: String,
    },

    profilePhoto: {
      type: String,
    },

    verificationStatus: {
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

    isProfileVisible: {
      type: Boolean,
      default: false,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    totalConsultations: {
      type: Number,
      default: 0,
    },

    razorpayAccountId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lawyer", lawyerSchema);