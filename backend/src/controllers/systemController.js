const mongoose = require('mongoose');
const Request = require('../models/Request');
const Workflow = require('../models/Workflow');
const Rule = require('../models/Rule');
const DependencyLog = require('../models/DependencyLog');
const externalCreditService = require('../services/integrations/externalCreditService');
const ApiResponse = require('../utils/apiResponse');

class SystemController {
  static async getHealth(req, res) {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    const [totalRequests, totalWorkflows, totalRules] = await Promise.all([
      Request.countDocuments(),
      Workflow.countDocuments({ isActive: true }),
      Rule.countDocuments({ isActive: true })
    ]);

    return ApiResponse.success(res, {
      status: dbState === 1 ? 'HEALTHY' : 'DEGRADED',
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        name: mongoose.connection.name
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
        timestamp: new Date()
      },
      counts: {
        totalRequests,
        activeWorkflows: totalWorkflows,
        activeRules: totalRules
      }
    }, 'System health status');
  }

  static async getDependencyStatus(req, res) {
    try {
      const chaosConfig = externalCreditService.getChaosConfig();
      const recentCalls = await DependencyLog.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const totalCalls = await DependencyLog.countDocuments();
      const failedCalls = await DependencyLog.countDocuments({ isSuccess: false });
      const successfulCalls = await DependencyLog.countDocuments({ isSuccess: true });

      return ApiResponse.success(res, {
        service: chaosConfig,
        metrics: {
          totalCalls,
          successfulCalls,
          failedCalls,
          successRate: totalCalls > 0 ? +((successfulCalls / totalCalls) * 100).toFixed(1) : 100
        },
        recentCalls
      }, 'Dependency status retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching dependency status', 500, err.message);
    }
  }

  static async updateChaosConfig(req, res) {
    try {
      const { failureRate, forceMode, timeoutMs } = req.body;
      externalCreditService.setChaosConfig({ failureRate, forceMode, timeoutMs });
      return ApiResponse.success(
        res,
        externalCreditService.getChaosConfig(),
        'Chaos simulation configuration updated successfully'
      );
    } catch (err) {
      return ApiResponse.error(res, 'Error updating chaos configuration', 500, err.message);
    }
  }

  static async getDashboardMetrics(req, res) {
    try {
      const [
        totalRequests,
        approvedRequests,
        rejectedRequests,
        manualReviewRequests,
        failedRequests,
        retryPendingRequests,
        recentRequests,
        workflows,
        requestsWithRetries
      ] = await Promise.all([
        Request.countDocuments(),
        Request.countDocuments({ status: 'APPROVED' }),
        Request.countDocuments({ status: 'REJECTED' }),
        Request.countDocuments({ status: 'MANUAL_REVIEW' }),
        Request.countDocuments({ status: 'FAILED' }),
        Request.countDocuments({ status: 'RETRY_PENDING' }),
        Request.find().sort({ createdAt: -1 }).limit(10).lean(),
        Workflow.find({ isActive: true }).select('name code category').lean(),
        Request.countDocuments({ retryCount: { $gt: 0 } })
      ]);

      // Category breakdown
      const statusBreakdown = [
        { name: 'Approved', value: approvedRequests, color: '#10B981' },
        { name: 'Rejected', value: rejectedRequests, color: '#EF4444' },
        { name: 'Manual Review', value: manualReviewRequests, color: '#F59E0B' },
        { name: 'Failed', value: failedRequests, color: '#6B7280' },
        { name: 'Retry Pending', value: retryPendingRequests, color: '#8B5CF6' }
      ];

      return ApiResponse.success(res, {
        kpis: {
          totalRequests,
          approvedRequests,
          rejectedRequests,
          manualReviewRequests,
          failedRequests,
          retryCount: requestsWithRetries,
          approvalRate: totalRequests > 0 ? +((approvedRequests / totalRequests) * 100).toFixed(1) : 0
        },
        statusBreakdown,
        recentRequests,
        activeWorkflows: workflows
      }, 'Dashboard metrics retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error retrieving dashboard metrics', 500, err.message);
    }
  }
}

module.exports = SystemController;
