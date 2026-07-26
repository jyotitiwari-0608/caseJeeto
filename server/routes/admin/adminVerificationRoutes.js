const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const validateObjectId = require('../../middleware/validateObjectId');
const adminVerificationController = require('../../controllers/admin/adminVerificationController');
// const adminVerificationController = require('../../controllers/admin/adminVerificationController');

router.use(verifyToken, requireRole('admin'));

router.get('/pending/:type', adminVerificationController.getPendingDocuments);
router.get('/:lawyerId', validateObjectId('lawyerId'), adminVerificationController.getLawyerVerificationDetail);
router.patch('/:lawyerId/suspend', validateObjectId('lawyerId'), adminVerificationController.suspendLawyer);
router.patch('/:lawyerId/experience/:entryId', validateObjectId('lawyerId'), adminVerificationController.reviewExperienceEntry);
router.patch('/:lawyerId/:type', validateObjectId('lawyerId'), adminVerificationController.reviewDocument);

module.exports = router;
