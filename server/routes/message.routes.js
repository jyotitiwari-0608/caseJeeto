// routes/message.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const messageController = require('../controllers/messageController');
const validateObjectId = require('../middleware/validateObjectId.middleware');

router.use(verifyToken, requireRole('client'));

router.post('/with/:lawyerId', validateObjectId('lawyerId'), messageController.getOrCreateConversation);
router.get('/', messageController.getConversations);
router.get('/:id/messages', validateObjectId('id'), messageController.getMessagesByConversation);

module.exports = router;