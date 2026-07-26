const mongoose = require("mongoose");

const bankVerificationSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
    },

    accountHolderName: {
      type: String,
      required: true,
    },

    bankName: {
      type: String,
      required: true,
    },

    accountNumber: {
      type: String,
      required: true,
      select: false,
    },

    ifscCode: {
      type: String,
      required: true,
      uppercase: true,
    },

    cancelledChequeUrl: String,

    passbookUrl: String,

    razorpayLinkedAccountId: String,

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
  "BankVerification",
  bankVerificationSchema
);