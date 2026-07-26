const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const validateObjectId = require('../middleware/validateObjectId.middleware');
const consultationController = require('../controllers/consultationController');

router.get('/:id/video-token', verifyToken, validateObjectId('id'), consultationController.getVideoToken);

module.exports = router;
