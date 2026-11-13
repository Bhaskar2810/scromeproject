const express = require('express');
const SystemController = require('../controllers/systemController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.get('/health', SystemController.getHealth);
router.get('/dependencies/status', authenticate, SystemController.getDependencyStatus);
router.post('/dependencies/chaos', authenticate, authorize(['admin']), SystemController.updateChaosConfig);
router.get('/dashboard/metrics', authenticate, SystemController.getDashboardMetrics);

module.exports = router;
