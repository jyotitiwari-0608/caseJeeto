// // server/models/Booking.js
// // clientId and lawyerId both point at User (not LawyerProfile) so that the
// // auth-scoping logic coming in Phase 4 — "a client only ever sees their own
// // bookings, a lawyer only ever sees bookings made with them" — can compare
// // directly against req.user.userId without an extra lookup.
// /**
//  * Client books lawyer
//         │
//         ▼
// Booking
//         │
//         ▼
// Payment
//         │
//         ▼
// Chat
//         │
//         ▼
// Video Consultation
//  */
// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const bookingSchema = new Schema(
//   {
//     clientId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     lawyerId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     scheduledAt: {
//       type: Date,
//       required: true,
//     },
//     durationMinutes: {
//       type: Number,
//       required: true,
//       default: 30,
//       min: 5,
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'confirmed', 'completed', 'cancelled'],
//       default: 'pending', // stays pending until payment is confirmed (Phase 9)
//     },
//     paymentId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Payment',
//       default: null,
//     },
//     dailyRoomUrl: {
//       type: String,
//       default: null, // populated once status flips to confirmed (Phase 8)
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('Booking', bookingSchema);
const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lawyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, default: 30, min: 5 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    dailyRoomUrl: { type: String, default: null },
  },
  { timestamps: true }
);

// Availability checks and lawyer-side calendar views both filter by
// lawyerId + a time range — this compound index covers both.
bookingSchema.index({ lawyerId: 1, scheduledAt: 1 });
// Client dashboard: "my bookings", sorted newest-first.
bookingSchema.index({ clientId: 1, scheduledAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);