// sockets/index.js
const mongoose = require('mongoose');
const Conversation = require('../models/conversation');

const MAX_MESSAGE_LENGTH = 5000;

function validConversationId(value) {
  return typeof value === 'string' && mongoose.isObjectIdOrHexString(value);
}

function fail(callback, error) {
  if (typeof callback === 'function') callback({ ok: false, error });
}

function isParticipant(conversation, userId) {
  return conversation.clientId.equals(userId) || conversation.lawyerId.equals(userId);
}

// Wired in from server.js as: require('./sockets')(io)
// Auth (socketAuth.middleware.js) already ran before any handler here
// fires, so socket.user = { userId, role } is guaranteed to exist.
module.exports = (io) => {
  io.on('connection', (socket) => {
    const authorizedConversations = new Set();
    const lastTypingEventAt = new Map();
    // JOIN A CONVERSATION ROOM
    // Client must call this before sending/receiving messages for a
    // thread. Verifies the socket's user is actually a participant
    // (client or lawyer on this exact conversation) before letting them
    // into the Socket.IO room — otherwise anyone with a conversationId
    // could eavesdrop.
    socket.on('join_conversation', async (conversationId, callback) => {
      try {
        if (!validConversationId(conversationId)) {
          return fail(callback, 'Invalid conversation id.');
        }
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return callback?.({ ok: false, error: 'Conversation not found.' });
        }

        if (!isParticipant(conversation, socket.user.userId)) {
          return callback?.({ ok: false, error: 'Not authorized for this conversation.' });
        }

        socket.join(conversationId);
        authorizedConversations.add(conversationId);
        return callback?.({ ok: true });
      } catch (err) {
        console.error('Socket join_conversation failed:', err.message);
        return fail(callback, 'Could not join conversation.');
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (validConversationId(conversationId)) {
        authorizedConversations.delete(conversationId);
        lastTypingEventAt.delete(conversationId);
        socket.leave(conversationId);
      }
    });

    // SEND A MESSAGE
    // Persists to the Conversation document (source of truth), then
    // broadcasts to everyone else currently in that room. The sender
    // gets their own copy back via the callback rather than the
    // broadcast, so it can't double-render on their own screen.
    socket.on('send_message', async (payload, callback) => {
      try {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return fail(callback, 'Invalid message payload.');
        }
        const { conversationId, text } = payload;
        if (!validConversationId(conversationId)) {
          return fail(callback, 'Invalid conversation id.');
        }
        if (typeof text !== 'string' || !text.trim()) {
          return callback?.({ ok: false, error: 'Message text is required.' });
        }
        if (text.trim().length > MAX_MESSAGE_LENGTH) {
          return fail(callback, `Messages cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return callback?.({ ok: false, error: 'Conversation not found.' });
        }

        if (!isParticipant(conversation, socket.user.userId)) {
          return callback?.({ ok: false, error: 'Not authorized for this conversation.' });
        }

        const message = {
          senderId: socket.user.userId,
          text: text.trim(),
          sentAt: new Date(),
          readBy: [socket.user.userId], // sender has implicitly "read" their own message
        };

        conversation.messages.push(message);
        await conversation.save();

        const savedMessage = conversation.messages[conversation.messages.length - 1];

        // Broadcast to every OTHER socket in the room (not the sender).
        socket.to(conversationId).emit('new_message', {
          conversationId,
          message: savedMessage,
        });

        return callback?.({ ok: true, message: savedMessage });
      } catch (err) {
        console.error('Socket send_message failed:', err.message);
        return fail(callback, 'Could not send message.');
      }
    });

    // TYPING INDICATOR — ephemeral, never persisted.
    socket.on('typing', async (payload, callback) => {
      try {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
            !validConversationId(payload.conversationId) || typeof payload.isTyping !== 'boolean') {
          return fail(callback, 'Invalid typing payload.');
        }
        if (!authorizedConversations.has(payload.conversationId)) {
          return fail(callback, 'Join this conversation before sending typing events.');
        }

        const now = Date.now();
        const lastEvent = lastTypingEventAt.get(payload.conversationId) || 0;
        if (now - lastEvent < 250) return callback?.({ ok: true, throttled: true });
        lastTypingEventAt.set(payload.conversationId, now);

        socket.to(payload.conversationId).emit('typing', {
          conversationId: payload.conversationId,
          userId: socket.user.userId,
          isTyping: payload.isTyping,
        });
        return callback?.({ ok: true });
      } catch (err) {
        console.error('Socket typing failed:', err.message);
        return fail(callback, 'Could not update typing status.');
      }
    });

    // MARK READ — same effect as lawyerMessageController.markConversationRead
    // / a client-side equivalent, but pushed live over the socket so the
    // other participant's unread badge clears instantly.
    socket.on('mark_read', async (conversationId, callback) => {
      try {
        if (!validConversationId(conversationId)) {
          return fail(callback, 'Invalid conversation id.');
        }
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return callback?.({ ok: false, error: 'Conversation not found.' });
        }

        if (!isParticipant(conversation, socket.user.userId)) {
          return callback?.({ ok: false, error: 'Not authorized for this conversation.' });
        }

        let changed = false;
        conversation.messages.forEach((m) => {
          if (!m.readBy.some((id) => id.equals(socket.user.userId))) {
            m.readBy.push(socket.user.userId);
            changed = true;
          }
        });

        if (changed) await conversation.save();

        socket.to(conversationId).emit('conversation_read', {
          conversationId,
          readBy: socket.user.userId,
        });

        return callback?.({ ok: true });
      } catch (err) {
        console.error('Socket mark_read failed:', err.message);
        return fail(callback, 'Could not mark conversation as read.');
      }
    });
  });
};
