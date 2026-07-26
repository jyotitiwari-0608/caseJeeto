const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const lawyerReviewController = require('../controllers/lawyerReviewController');

router.use(verifyToken, requireRole('lawyer'));

router.get('/', lawyerReviewController.getMyReviews);

module.exports = router;
