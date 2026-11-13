const express = require('express');
const authRoutes = require('./authRoutes');
const requestRoutes = require('./requestRoutes');
const workflowRoutes = require('./workflowRoutes');
const ruleRoutes = require('./ruleRoutes');
const reviewRoutes = require('./reviewRoutes');
const auditRoutes = require('./auditRoutes');
const systemRoutes = require('./systemRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/requests', requestRoutes);
router.use('/workflows', workflowRoutes);
router.use('/rules', ruleRoutes);
router.use('/reviews', reviewRoutes);
router.use('/audit', auditRoutes);
router.use('/', systemRoutes); // Mounts /health, /dependencies/status, /dashboard/metrics under /api

module.exports = router;
