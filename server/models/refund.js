const mongoose = require("mongoose");
const { Schema } = mongoose;

const refundSchema = new Schema(
  {
    // ===============================================================
    // REFERENCES
    // ===============================================================

    // ------------------------------------------------------------------
    // Payment against which this refund is issued.
    // One refund always belongs to one payment.
    // ------------------------------------------------------------------
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    // ------------------------------------------------------------------
    // Booking associated with the refunded payment.
    // Makes it easy to identify which consultation is being refunded.
    // ------------------------------------------------------------------
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // ------------------------------------------------------------------
    // Client receiving the refund.
    // Useful for refund history and admin reports.
    // ------------------------------------------------------------------
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ------------------------------------------------------------------
    // Lawyer associated with this booking.
    // Helps generate reports such as:
    // "How many refunds were caused by this lawyer?"
    // ------------------------------------------------------------------
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ===============================================================
    // REFUND DETAILS
    // ===============================================================

    // ------------------------------------------------------------------
    // Amount refunded to the client.
    //
    // Store in the smallest currency unit.
    //
    // Example
    //
    // ₹1000
    //
    // becomes
    //
    // 100000 paise
    // ------------------------------------------------------------------
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ------------------------------------------------------------------
    // Why is the refund being issued?
    //
    // Every refund must have a business reason.
    //
    // LAWYER_CANCELLED
    // Lawyer cancelled the consultation.
    //
    // CLIENT_CANCELLED_WITHIN_POLICY
    // Client cancelled within the allowed cancellation window.
    //
    // CLIENT_CANCELLED_OUTSIDE_POLICY
    // Client cancelled too late.
    // May result in partial or zero refund depending on policy.
    //
    // BOOKING_CREATION_FAILED
    // Payment succeeded but booking could not be created.
    //
    // LAWYER_NO_SHOW
    // Lawyer never joined the consultation.
    //
    // TECHNICAL_FAILURE
    // Daily.co, backend or infrastructure failure.
    //
    // DUPLICATE_PAYMENT
    // Client accidentally paid twice.
    //
    // ADMIN_GOODWILL
    // Manual refund approved by admin.
    //
    // OTHER
    // Any situation not covered above.
    // ------------------------------------------------------------------
    refundReason: {
      type: String,
      enum: [
        "LAWYER_CANCELLED",

    "CLIENT_CANCELLED_WITHIN_POLICY",

    "CLIENT_CANCELLED_OUTSIDE_POLICY",

    "BOOKING_CREATION_FAILED",

    "LAWYER_NO_SHOW",

    "TECHNICAL_FAILURE",

    "DUPLICATE_PAYMENT",

    "LAWYER_MISCONDUCT",

    "OTHER"
      ],
      required: true,
    },

    // ------------------------------------------------------------------
    // Additional explanation for the refund.
    //
    // Example:
    //
    // "Client cancelled 28 hours before consultation."
    //
    // "Lawyer informed medical emergency."
    // ------------------------------------------------------------------
    refundNote: {
      type: String,
      trim: true,
      default: null,
    },

    // ===============================================================
    // REASON VERIFICATION
    // ===============================================================

    // ------------------------------------------------------------------
    // Stores the evidence proving why the refund was approved.
    //
    // Example
    //
    // LAWYER_NO_SHOW
    // Evidence:
    // Client joined at 3:00 PM.
    // Lawyer never joined for 15 minutes.
    //
    // TECHNICAL_FAILURE
    // Evidence:
    // Daily.co API outage.
    //
    // DUPLICATE_PAYMENT
    // Evidence:
    // Two successful UPI transactions found.
    //
    // This creates an audit trail for future disputes.
    // ------------------------------------------------------------------
    reasonVerification: {
      verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      verifiedAt: {
        type: Date,
      },

      evidence: {
        type: String,
        required: true,
        trim: true,
      },

      attachments: [
        {
          type: String,
        },
      ],
    },

    // ===============================================================
    // REFUND STATUS
    // ===============================================================

    // ------------------------------------------------------------------
    // Current lifecycle of the refund.
    //
    // requested
    // Client/Admin requested refund.
    //
    // under_review
    // Admin is reviewing evidence.
    //
    // approved
    // Refund approved but Razorpay not called yet.
    //
    // rejected
    // Refund request rejected.
    //
    // processing
    // Razorpay refund request initiated.
    //
    // completed
    // Money successfully refunded.
    //
    // failed
    // Refund failed.
    // ------------------------------------------------------------------
    refundStatus: {
      type: String,
      enum: [
        "requested",
        "under_review",
        "approved",
        "rejected",
        "processing",
        "completed",
        "failed",
      ],
      default: "requested",
    },

    // ===============================================================
    // ADMIN APPROVAL
    // ===============================================================

    // ------------------------------------------------------------------
    // Admin who approved the refund.
    // ------------------------------------------------------------------
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ------------------------------------------------------------------
    // Date and time when refund was approved.
    // ------------------------------------------------------------------
    approvedAt: {
      type: Date,
      default: null,
    },

    // ===============================================================
    // RAZORPAY
    // ===============================================================

    // ------------------------------------------------------------------
    // Refund ID returned by Razorpay.
    // Used for reconciliation and dashboard tracking.
    // ------------------------------------------------------------------
    razorpayRefundId: {
      type: String,
      default: null,
    },

    // ------------------------------------------------------------------
    // Date when Razorpay successfully processed the refund.
    // ------------------------------------------------------------------
    refundedAt: {
      type: Date,
      default: null,
    },

    // ===============================================================
    // FAILURE INFORMATION
    // ===============================================================

    // ------------------------------------------------------------------
    // Stores why the refund failed.
    //
    // Example
    //
    // Razorpay API Error
    // Invalid Payment ID
    // Refund Window Expired
    // Bank Rejected Refund
    // ------------------------------------------------------------------
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    // Automatically adds:
    //
    // createdAt
    // updatedAt
    timestamps: true,
  }
);

refundSchema.index({ clientId: 1, createdAt: -1 });
refundSchema.index({ lawyerId: 1, createdAt: -1 });
// One reusable refund lifecycle per payment. A rejected request can be
// reset and resubmitted, while concurrent active requests cannot duplicate.
refundSchema.index({ paymentId: 1 }, { unique: true });

module.exports = mongoose.model("Refund", refundSchema);
