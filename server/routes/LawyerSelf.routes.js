const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const lawyerProfileController = require('../controllers/lawyerProfileController');

router.use(verifyToken, requireRole('lawyer'));

router.get('/me', lawyerProfileController.getMyProfile);
router.patch('/me', lawyerProfileController.updateMyProfile);
router.patch('/me/visibility', lawyerProfileController.toggleVisibility);

module.exports = router;
