// routes/consultation.routes.js
// Mounted twice in server.js under both /api/bookings and
// /api/lawyers/me/bookings — verifyToken is enough here since
// consultationController checks ownership against role internally.
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const validateObjectId = require('../middleware/validateObjectId.middleware');
const consultationController = require('../controllers/consultationController');

router.get('/:id/video-token', verifyToken, validateObjectId('id'), consultationController.getVideoToken);

module.exports = router;