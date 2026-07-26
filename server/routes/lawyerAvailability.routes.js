const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const availabilityController = require('../controllers/availabilityController');

router.use(verifyToken, requireRole('lawyer'));

router.post('/', availabilityController.setAvailability);
router.get('/', availabilityController.getMyAvailability);
router.patch('/:availabilityId/slots/:slotId', availabilityController.updateSlot);
router.delete('/:availabilityId/slots/:slotId', availabilityController.deleteSlot);

module.exports = router;
