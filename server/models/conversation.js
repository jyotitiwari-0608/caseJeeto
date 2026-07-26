const mongoose = require("mongoose");

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },

    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    _id: true,
  }
);

const conversationSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ clientId: 1, lawyerId: 1 }, { unique: true });

module.exports = mongoose.model(
  "Conversation",
  conversationSchema
);
