// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// // One document per lawyer per calendar date. Keeps slot-locking simple:
// // booking a slot is an atomic findOneAndUpdate against this one document
// // instead of scanning across many small slot documents.
// const slotSchema = new Schema(
//   {
//     startTime: {
//       type: Date,
//       required: true,
//     },
//     endTime: {
//       type: Date,
//       required: true,
//     },
//     isBooked: {
//       type: Boolean,
//       default: false,
//     },
//     bookingId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Booking',
//       default: null,
//     },
//   },
//   { _id: true }
// );

// const availabilitySchema = new Schema(
//   {
//     lawyerId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Lawyer',
//       required: true,
//     },

//     // Store as a normalized UTC midnight date, e.g. 2026-07-20T00:00:00Z,
//     // so lookups are `Availability.findOne({ lawyerId, date })`.
//     date: {
//       type: Date,
//       required: true,
//     },

//     slots: [slotSchema],
//   },
//   {
//     timestamps: true,
//   }
// );

// availabilitySchema.index({ lawyerId: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('Availability', availabilitySchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;

// One document per lawyer per calendar date. Keeps slot-locking simple:
// booking a slot is an atomic findOneAndUpdate against this one document
// instead of scanning across many small slot documents.
const slotSchema = new Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  { _id: true }
);

const availabilitySchema = new Schema(
  {
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: 'Lawyer',
      required: true,
    },

    // Store as a normalized UTC midnight date, e.g. 2026-07-20T00:00:00Z,
    // so lookups are `Availability.findOne({ lawyerId, date })`.
    date: {
      type: Date,
      required: true,
    },

    slots: [slotSchema],
  },
  {
    timestamps: true,
  }
);

availabilitySchema.index({ lawyerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);