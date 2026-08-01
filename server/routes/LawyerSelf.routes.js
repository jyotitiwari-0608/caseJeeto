const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const lawyerProfileController = require('../controllers/lawyerProfileController');

const lawyerOnly = [verifyToken, requireRole('lawyer')];

router.get('/me', ...lawyerOnly, lawyerProfileController.getMyProfile);
router.patch('/me', ...lawyerOnly, lawyerProfileController.updateMyProfile);
router.patch('/me/visibility', ...lawyerOnly, lawyerProfileController.toggleVisibility);

module.exports = router;
