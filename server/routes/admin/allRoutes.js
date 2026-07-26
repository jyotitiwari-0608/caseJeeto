
/* ==========================================
   FILE: C:\Users\tiwar\OneDrive\Desktop\caseJeeto\server\routes\admin\adminRefund.js
========================================== */

const express = require('express');
//[commented bcse of redeclaration in .js file] const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const validateObjectId = require('../../middleware/validateObjectId');
const adminRefundController = require('../controllers/adminRefundController');

router.use(verifyToken, requireRole('admin'));

router.get('/', adminRefundController.getRefunds);
router.get('/:id', validateObjectId('id'), adminRefundController.getRefundById);
router.patch('/:id/review', validateObjectId('id'), adminRefundController.reviewRefund);
router.patch('/:id/mark-processed', validateObjectId('id'), adminRefundController.markProcessed);

module.exports = router;



/* ==========================================
   FILE: C:\Users\tiwar\OneDrive\Desktop\caseJeeto\server\routes\admin\adminVerificationRoutes.js
========================================== */

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const validateObjectId = require('../../middleware/validateObjectId');
const adminVerificationController = require('../controllers/adminVerificationController');

router.use(verifyToken, requireRole('admin'));

router.get('/pending/:type', adminVerificationController.getPendingDocuments);
router.get('/:lawyerId', validateObjectId('lawyerId'), adminVerificationController.getLawyerVerificationDetail);
router.patch('/:lawyerId/suspend', validateObjectId('lawyerId'), adminVerificationController.suspendLawyer);
router.patch('/:lawyerId/experience/:entryId', validateObjectId('lawyerId'), adminVerificationController.reviewExperienceEntry);
router.patch('/:lawyerId/:type', validateObjectId('lawyerId'), adminVerificationController.reviewDocument);

module.exports = router;


