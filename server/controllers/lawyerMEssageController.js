const Conversation = require('../models/conversation');

// GET /api/lawyers/me/conversations
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ lawyerId: req.user.userId })
      .populate('clientId', 'name')
      .select('clientId lawyerId updatedAt messages')
      .sort({ updatedAt: -1 });

    // Trim to a lightweight inbox preview (last message + unread count)
    // instead of shipping every message in every thread on list load.
    const preview = conversations.map((c) => {
      const lastMessage = c.messages[c.messages.length - 1] || null;
      const unreadCount = c.messages.filter(
        (m) => !m.readBy.some((id) => id.equals(req.user.userId))
      ).length;
      return {
        _id: c._id,
        client: c.clientId,
        lastMessage,
        unreadCount,
        updatedAt: c.updatedAt,
      };
    });

    return res.status(200).json({ conversations: preview });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch conversations.', error: err.message });
  }
};

// GET /api/lawyers/me/conversations/:id/messages?page=&limit=
exports.getMessagesByConversation = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    const conversation = await Conversation.findById(req.params.id).populate('clientId', 'name');
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    if (!conversation.lawyerId.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation.' });
    }

    // Messages are embedded, so pagination happens in memory on the
    // fetched subdocument array rather than a separate query. Fine at
    // moderate volumes; if a thread grows very large, consider migrating
    // messages to their own collection with a real skip/limit query.
    const sorted = [...conversation.messages].sort((a, b) => b.sentAt - a.sentAt);
    const start = (Number(page) - 1) * Number(limit);
    const pageMessages = sorted.slice(start, start + Number(limit)).reverse();

    return res.status(200).json({
      conversationId: conversation._id,
      client: conversation.clientId,
      messages: pageMessages,
      page: Number(page),
      limit: Number(limit),
      total: conversation.messages.length,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch messages.', error: err.message });
  }
};

// PATCH /api/lawyers/me/conversations/:id/read
// Marks every message not sent by this lawyer as read by them — clears
// the unread badge used in the inbox preview above.
exports.markConversationRead = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    if (!conversation.lawyerId.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized for this conversation.' });
    }

    let changed = false;
    conversation.messages.forEach((m) => {
      if (!m.readBy.some((id) => id.equals(req.user.userId))) {
        m.readBy.push(req.user.userId);
        changed = true;
      }
    });

    if (changed) await conversation.save();

    return res.status(200).json({ message: 'Conversation marked as read.' });
  } catch (err) {
    return res.status(500).json({ message: 'Could not mark conversation read.', error: err.message });
  }
};