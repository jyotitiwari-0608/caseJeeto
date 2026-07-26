// routes/refund.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const validateObjectId = require('../middleware/validateObjectId.middleware');
const refundController = require('../controllers/refundController');

router.use(verifyToken, requireRole('client'));

router.post('/', refundController.requestRefund);
router.get('/me', refundController.getMyRefunds);
router.get('/:id', validateObjectId('id'), refundController.getRefundById);

module.exports = router;