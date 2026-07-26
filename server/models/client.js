// const { Schema, model } = require('mongoose');
// const mongoose = require('mongoose');

// const clientSchema = new Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       unique: true,
//     },

//     // CHANGED: renamed from `savedLawyer` -> `savedLawyers` (was singular name
//     // holding an array, kept the ref/required exactly as before).
//     savedLawyers: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Lawyer',
//       },
//     ],

//     // NEW: lawyers this client has blocked. Hidden from this client's search
//     // results; createBooking / createConversation should reject if either
//     // party has blocked the other. Decide blocking semantics in the
//     // controller layer, not here.
//     blockedLawyers: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Lawyer',
//       },
//     ],

//     // NEW: short client-facing bio, optional.
//     bio: {
//       type: String,
//       trim: true,
//       maxlength: 500,
//       default: '',
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = model('Client', clientSchema);

const { Schema, model } = require('mongoose');
const mongoose = require('mongoose');

const clientSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // CHANGED: renamed from `savedLawyer` -> `savedLawyers` (was singular name
    // holding an array, kept the ref/required exactly as before).
    savedLawyers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lawyer',
      },
    ],

    // NEW: lawyers this client has blocked. Hidden from this client's search
    // results; createBooking / createConversation should reject if either
    // party has blocked the other. Decide blocking semantics in the
    // controller layer, not here.
    blockedLawyers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lawyer',
      },
    ],

    // NEW: short client-facing bio, optional.
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model('Client', clientSchema);