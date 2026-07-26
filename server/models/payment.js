// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const paymentSchema = new Schema(
// {
//     // ------------------------------------------------------------------
//     // Client who made the payment.
//     // Useful for showing payment history and admin reports.
//     // ------------------------------------------------------------------
//     clientId: {
//         type: Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//     },

//     // ------------------------------------------------------------------
//     // Lawyer who will receive the consultation amount.
//     // Used for payouts, earnings dashboard and financial reports.
//     // ------------------------------------------------------------------
//     lawyerId: {
//         type: Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//     },

//     // ------------------------------------------------------------------
//     // Booking associated with this payment.
//     // One payment belongs to one booking.
//     // Allows us to know which consultation this payment was for.
//     // ------------------------------------------------------------------
//     bookingId: {
//         type: Schema.Types.ObjectId,
//         ref: "Booking",
//         required: true,
//     },

//     // ------------------------------------------------------------------
//     // Consultation fee charged by the lawyer.
//     // Stored in the smallest currency unit (paise).
//     //
//     // Example
//     // ₹1000
//     // becomes
//     // 100000 paise
//     // ------------------------------------------------------------------
//     consultationFee: {
//         type: Number,
//         required: true,
//         min: 0,
//     },

//     // ------------------------------------------------------------------
//     // Amount retained by CaseLeeto as platform commission.
//     //
//     // Example
//     //
//     // Consultation Fee = ₹1000
//     //
//     // Platform Fee = ₹150
//     // ------------------------------------------------------------------
//     platformFee: {
//         type: Number,
//         required: true,
//         min: 0,
//     },

//     // ------------------------------------------------------------------
//     // Amount transferred to the lawyer.
//     //
//     // Example
//     //
//     // ₹1000
//     //
//     // Platform Fee ₹150
//     //
//     // Lawyer receives ₹850
//     // ------------------------------------------------------------------
//     lawyerPayout: {
//         type: Number,
//         required: true,
//         min: 0,
//     },

//     // ------------------------------------------------------------------
//     // Currency in which payment was made.
//     //
//     // Default = INR
//     //
//     // Helpful if international payments are supported later.
//     // ------------------------------------------------------------------
//     currency: {
//         type: String,
//         default: "INR",
//         uppercase: true,
//     },

//     // ================================================================
//     // Razorpay Identifiers
//     // ================================================================

//     // ------------------------------------------------------------------
//     // Razorpay Order ID.
//     //
//     // Generated before user pays.
//     // Represents a payment request.
//     // ------------------------------------------------------------------
//     razorpayOrderId: {
//         type: String,
//         default: null,
//     },

//     // ------------------------------------------------------------------
//     // Razorpay Payment ID.
//     //
//     // Generated only after successful payment.
//     // Represents the actual payment transaction.
//     // ------------------------------------------------------------------
//     razorpayPaymentId: {
//         type: String,
//         default: null,
//     },

//     // ------------------------------------------------------------------
//     // Razorpay Route Transfer ID.
//     //
//     // Represents the transfer from platform account
//     // to lawyer's linked Razorpay account.
//     // ------------------------------------------------------------------
//     razorpayTransferId: {
//         type: String,
//         default: null,
//     },

//     // ------------------------------------------------------------------
//     // Lawyer's Razorpay Linked Account ID.
//     //
//     // Needed when using Razorpay Route.
//     // Identifies the destination account for payout.
//     // ------------------------------------------------------------------
//     razorpayLinkedAccountId: {
//         type: String,
//         default: null,
//     },

//     // ================================================================
//     // Payment Status
//     // ================================================================

//     // ------------------------------------------------------------------
//     // Current payment lifecycle.
//     //
//     // created
//     // → Order created
//     //
//     // paid
//     // → Money received
//     //
//     // failed
//     // → Payment unsuccessful
//     //
//     // cancelled
//     // → User cancelled payment
//     //
//     // refunded
//     // → Refund completed
//     // ------------------------------------------------------------------
//     paymentStatus: {
//         type: String,
//         enum: [
//             "created",
//             "paid",
//             "failed",
//             "cancelled",
//             "refunded"
//         ],
//         default: "created",
//     },

//     // ------------------------------------------------------------------
//     // Tracks lawyer payout separately.
//     //
//     // Payment may be successful,
//     // but payout can still be pending.
//     //
//     // Example
//     //
//     // Client paid today
//     //
//     // Lawyer receives money tomorrow.
//     // ------------------------------------------------------------------
//     payoutStatus: {
//         type: String,
//         enum: [
//             "pending",
//             "processing",
//             "completed",
//             "failed"
//         ],
//         default: "pending",
//     },

//     // ================================================================
//     // Refund Information
//     // ================================================================

//     // ------------------------------------------------------------------
//     // Amount refunded to the client.
//     //
//     // Can be
//     //
//     // Full refund
//     //
//     // Partial refund
//     // ------------------------------------------------------------------
//     refundAmount: {
//         type: Number,
//         default: 0,
//     },

//     // ------------------------------------------------------------------
//     // Reason for refund.
//     //
//     // Examples
//     //
//     // Lawyer Cancelled
//     // Client Cancelled
//     // Technical Issue
//     // Duplicate Payment
//     // Admin Refund
//     // ------------------------------------------------------------------
//     refundReason: {
//         type: String,
//         default: null,
//     },

//     // ------------------------------------------------------------------
//     // Date and time when refund was processed.
//     // ------------------------------------------------------------------
//     refundedAt: {
//         type: Date,
//         default: null,
//     },

//     // ------------------------------------------------------------------
//     // Refund ID returned by Razorpay.
//     //
//     // Used to track refund inside Razorpay Dashboard.
//     // ------------------------------------------------------------------
//     razorpayRefundId: {
//         type: String,
//         default: null,
//     },

//     // ================================================================
//     // Failure Information
//     // ================================================================

//     // ------------------------------------------------------------------
//     // Stores why payment failed.
//     //
//     // Examples
//     //
//     // Insufficient Balance
//     // UPI Timeout
//     // Card Declined
//     // Network Error
//     // ------------------------------------------------------------------
//     failureReason: {
//         type: String,
//         default: null,
//     },

//     // ================================================================
//     // Security
//     // ================================================================

//     // ------------------------------------------------------------------
//     // Never trust frontend payment success.
//     //
//     // This becomes true only after Razorpay webhook
//     // confirms payment.
//     // ------------------------------------------------------------------
//     webhookVerified: {
//         type: Boolean,
//         default: false,
//     },
// },
// {
//     // Automatically creates
//     //
//     // createdAt
//     // updatedAt
//     timestamps: true,
// }
// );

// module.exports = mongoose.model("Payment", paymentSchema);


const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
{
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lawyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },

    // Stored internally in paise (smallest currency unit) throughout the
    // app and DB — never store rupees. Conversion to rupees for display
    // happens ONLY at the API boundary, via the toJSON transform below,
    // so every endpoint that returns a Payment automatically returns the
    // same (rupee) shape without each controller remembering to /100.
    consultationFee: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    lawyerPayout: { type: Number, required: true, min: 0 },

    currency: { type: String, default: "INR", uppercase: true },

    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpayTransferId: { type: String, default: null },
    razorpayLinkedAccountId: { type: String, default: null },

    paymentStatus: {
        type: String,
        enum: ["created", "paid", "failed", "cancelled", "refunded"],
        default: "created",
    },

    payoutStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
    },

    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    razorpayRefundId: { type: String, default: null },

    failureReason: { type: String, default: null },

    webhookVerified: { type: Boolean, default: false },
},
{
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Rupee-converted mirror fields alongside the raw paise fields.
        // Frontend should read *_inRupees; the raw paise fields stay
        // available for anyone doing exact arithmetic server-side.
        ret.consultationFeeInRupees = ret.consultationFee / 100;
        ret.platformFeeInRupees = ret.platformFee / 100;
        ret.lawyerPayoutInRupees = ret.lawyerPayout / 100;
        ret.refundAmountInRupees = (ret.refundAmount || 0) / 100;
        return ret;
      },
    },
}
);

paymentSchema.index({ clientId: 1, createdAt: -1 });
paymentSchema.index({ lawyerId: 1, createdAt: -1 });
paymentSchema.index({ bookingId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);