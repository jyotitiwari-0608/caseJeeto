// routes/review.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, attachUserIfPresent } = require('../middleware/auth.middleware');
const validateObjectId = require('../middleware/validateObjectId.middleware');
const reviewController = require('../controllers/reviewController');

// Public — anyone can read a lawyer's reviews without logging in.
router.get('/lawyer/:lawyerId', validateObjectId('lawyerId'), attachUserIfPresent, reviewController.getReviewsForLawyer);

// Client-only — write actions.
router.post('/', verifyToken, requireRole('client'), reviewController.createReview);
router.patch('/:id', verifyToken, requireRole('client'), validateObjectId('id'), reviewController.updateReview);
router.delete('/:id', verifyToken, requireRole('client'), validateObjectId('id'), reviewController.deleteReview);

module.exports = router;