const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth.middleware');
const validateObjectId = require('../../middleware/validateObjectId.middleware');
const paymentController = require('../../controllers/paymentController');

router.post(
  '/:paymentId/reconcile-order',
  verifyToken,
  requireRole('admin'),
  validateObjectId('paymentId'),
  paymentController.reconcileOrderCreation
);

module.exports = router;
