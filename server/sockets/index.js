// sockets/index.js
const Conversation = require('../models/conversation');

// Wired in from server.js as: require('./sockets')(io)
// Auth (socketAuth.middleware.js) already ran before any handler here
// fires, so socket.user = { userId, role } is guaranteed to exist.
module.exports = (io) => {
  io.on('connection', (socket) => {
    // JOIN A CONVERSATION ROOM
    // Client must call this before sending/receiving messages for a
    // thread. Verifies the socket's user is actually a participant
    // (client or lawyer on this exact conversation) before letting them
    // into the Socket.IO room — otherwise anyone with a conversationId
    // could eavesdrop.
    socket.on('join_conversation', async (conversationId, callback) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return callback?.({ ok: false, error: 'Conversation not found.' });
        }

        const isParticipant =
          conversation.clientId.equals(socket.user.userId) ||
          conversation.lawyerId.equals(socket.user.userId);

        if (!isParticipant) {
          return callback?.({ ok: false, error: 'Not authorized for this conversation.' });
        }

        socket.join(conversationId);
        return callback?.({ ok: true });
      } catch (err) {
        return callback?.({ ok: false, error: err.message });
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // SEND A MESSAGE
    // Persists to the Conversation document (source of truth), then
    // broadcasts to everyone else currently in that room. The sender
    // gets their own copy back via the callback rather than the
    // broadcast, so it can't double-render on their own screen.
    socket.on('send_message', async ({ conversationId, text }, callback) => {
      try {
        if (!text || !text.trim()) {
          return callback?.({ ok: false, error: 'Message text is required.' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return callback?.({ ok: false, error: 'Conversation not found.' });
        }

        const isParticipant =
          conversation.clientId.equals(socket.user.userId) ||
          conversation.lawyerId.equals(socket.user.userId);

        if (!isParticipant) {
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
        return callback?.({ ok: false, error: err.message });
      }
    });

    // TYPING INDICATOR — ephemeral, never persisted.
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit('typing', {
        conversationId,
        userId: socket.user.userId,
        isTyping: !!isTyping,
      });
    });

    // MARK READ — same effect as lawyerMessageController.markConversationRead
    // / a client-side equivalent, but pushed live over the socket so the
    // other participant's unread badge clears instantly.
    socket.on('mark_read', async (conversationId, callback) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return callback?.({ ok: false, error: 'Conversation not found.' });
        }

        const isParticipant =
          conversation.clientId.equals(socket.user.userId) ||
          conversation.lawyerId.equals(socket.user.userId);
        if (!isParticipant) {
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
        return callback?.({ ok: false, error: err.message });
      }
    });
  });
};