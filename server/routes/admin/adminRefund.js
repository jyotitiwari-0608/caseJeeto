const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth.middleware');
// const { verifyToken, requireRole } = require('../../middleware/auth.middleware');
const validateObjectId = require('../../middleware/validateObjectId');
const adminRefundController = require('../../controllers/admin/adminRefundController');
// const adminRefundController = require('../../controllers/admin/adminRefundController');

router.use(verifyToken, requireRole('admin'));

router.get('/', adminRefundController.getRefunds);
router.get('/:id', validateObjectId('id'), adminRefundController.getRefundById);
router.patch('/:id/review', validateObjectId('id'), adminRefundController.reviewRefund);
router.patch('/:id/mark-processed', validateObjectId('id'), adminRefundController.markProcessed);

module.exports = router;
