const Conversation = require('../models/conversation');
const Lawyer = require('../models/lawyer');
const Client = require('../models/client');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess, paginationMeta } = require('../utils/apiResponse');

// POST /api/conversations/with/:lawyerId
// A conversation must exist before the first Socket.IO message can
// reference its conversationId — this is the REST bootstrap for that.
// Idempotent: calling it again just returns the existing conversation.
exports.getOrCreateConversation = asyncHandler(async (req, res) => {
  const { lawyerId } = req.params;

  const lawyer = await Lawyer.findById(lawyerId);
  if (!lawyer) {
    throw new AppError('Lawyer not found.', 404);
  }

  const client = await Client.findOne({ userId: req.user.userId });
  if (client && client.blockedLawyers.some((id) => id.equals(lawyerId))) {
    throw new AppError('You have blocked this lawyer.', 403);
  }

  let conversation = await Conversation.findOne({
    clientId: req.user.userId,
    lawyerId: lawyer.userId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      clientId: req.user.userId,
      lawyerId: lawyer.userId,
      messages: [],
    });
  }

  return sendSuccess(res, 200, { conversation });
});

// GET /api/conversations
// Inbox view: this client's conversation threads, most recently active
// first, with the last message as a preview so the frontend doesn't have
// to fetch every conversation's full message list just to render a list.
exports.getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = { clientId: req.user.userId };

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .populate('lawyerId', 'name')
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select({ messages: { $slice: -1 } }), // only the most recent message as a preview
    Conversation.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, { conversations }, paginationMeta({ total, page, limit }));
});

// GET /api/conversations/:id/messages
exports.getMessagesByConversation = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    throw new AppError('Conversation not found.', 404);
  }
  const isParticipant =
    conversation.clientId.equals(req.user.userId) || conversation.lawyerId.equals(req.user.userId);
  if (!isParticipant) {
    throw new AppError('Not authorized to view this conversation.', 403);
  }

  // Messages are embedded, so pagination is done in-memory over the
  // array rather than a Mongo skip/limit. Fine at consult-chat volume;
  // if a single thread grows past a few thousand messages, this embedded
  // design (see conversation.js's 16MB-doc-cap note) should move to its
  // own Message collection instead.
  const total = conversation.messages.length;
  const start = Math.max(0, total - Number(page) * Number(limit));
  const end = total - (Number(page) - 1) * Number(limit);
  const messages = conversation.messages.slice(start, end);

  return sendSuccess(res, 200, { messages }, paginationMeta({ total, page, limit }));
});
