
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