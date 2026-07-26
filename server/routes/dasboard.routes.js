const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.use(verifyToken, requireRole('lawyer'));

router.get('/', dashboardController.getDashboardSummary);

module.exports = router;