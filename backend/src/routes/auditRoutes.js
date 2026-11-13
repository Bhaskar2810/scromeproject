const express = require('express');
const AuditController = require('../controllers/auditController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, AuditController.getAuditLogs);
router.get('/:requestId', authenticate, AuditController.getRequestAudit);
router.get('/request/:requestId', authenticate, AuditController.getRequestAudit);

module.exports = router;
