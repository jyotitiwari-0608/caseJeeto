const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const verificationController = require('../controllers/verificationController');

router.use(verifyToken, requireRole('lawyer'));

router.get('/overview', verificationController.getVerificationOverview);

// :type matches a key in verificationController's DOCUMENT_TYPES map
// (governmentId, pan, barCouncilEnrollment, barCouncilId,
// certificateOfPractice, lawDegree, professionalPhoto, bankVerification)
router.get('/:type', verificationController.getDocumentStatus);
router.post('/:type', verificationController.submitDocument);

// Experience is array-based, so it gets its own sub-routes instead of the
// generic :type pattern above.
router.post('/experience/entries', verificationController.addExperience);
router.delete('/experience/entries/:entryId', verificationController.removeExperience);

module.exports = router;