const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const clientController = require('../controllers/clientController');
const savedLawyerController = require('../controllers/savedLawyerController');
const blockedLawyerController = require('../controllers/blockedLawyersController');

// Everything here belongs to the logged-in client only.
router.use(verifyToken, requireRole('client'));

router.get('/me', clientController.getMyProfile);
router.patch('/me', clientController.updateMyProfile);

router.get('/me/saved-lawyers', savedLawyerController.getSavedLawyers);
router.post('/me/saved-lawyers/:lawyerId', savedLawyerController.saveLawyer);
router.delete('/me/saved-lawyers/:lawyerId', savedLawyerController.unsaveLawyer);

router.get('/me/blocked-lawyers', blockedLawyerController.getBlockedLawyers);
router.post('/me/blocked-lawyers/:lawyerId', blockedLawyerController.blockLawyer);
router.delete('/me/blocked-lawyers/:lawyerId', blockedLawyerController.unblockLawyer);

module.exports = router;