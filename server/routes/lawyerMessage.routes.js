const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const lawyerMessageController = require('../controllers/lawyerMEssageController');

router.use(verifyToken, requireRole('lawyer'));

router.get('/', lawyerMessageController.getConversations);
router.get('/:id/messages', lawyerMessageController.getMessagesByConversation);
router.patch('/:id/read', lawyerMessageController.markConversationRead);

module.exports = router;
