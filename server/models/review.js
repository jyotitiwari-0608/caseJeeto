// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const reviewSchema = new Schema(
//   {
//     lawyerId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Lawyer',
//       required: true,
//     },

//     clientId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },

//     // One review per booking. Also lets us verify the booking was actually
//     // completed before allowing the review to be created.
//     bookingId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Booking',
//       required: true,
//     },

//     rating: {
//       type: Number,
//       required: true,
//       min: 1,
//       max: 5,
//     },

//     // Optional so star-only reviews are allowed.
//     comment: {
//       type: String,
//       trim: true,
//       maxlength: 1000,
//       default: '',
//     },

//     // Soft-deletable so a lawyer's rating history / dispute trail isn't lost
//     // on a client deleting their review.
//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // A client can only review a given booking once.
// reviewSchema.index({ clientId: 1, bookingId: 1 }, { unique: true });
// reviewSchema.index({ lawyerId: 1, createdAt: -1 });

// module.exports = mongoose.model('Review', reviewSchema);


const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: 'Lawyer',
      required: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // One review per booking. Also lets us verify the booking was actually
    // completed before allowing the review to be created.
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Optional so star-only reviews are allowed.
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    // Soft-deletable so a lawyer's rating history / dispute trail isn't lost
    // on a client deleting their review.
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// A client can only review a given booking once.
reviewSchema.index({ clientId: 1, bookingId: 1 }, { unique: true });
reviewSchema.index({ lawyerId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);