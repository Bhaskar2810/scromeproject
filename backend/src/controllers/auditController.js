const AuditService = require('../services/audit/auditService');
const ApiResponse = require('../utils/apiResponse');

class AuditController {
  static async getAuditLogs(req, res) {
    try {
      const { eventType, stage, limit = 50, page = 1 } = req.query;
      const result = await AuditService.getSystemLogs({ eventType, stage, limit, page });
      return ApiResponse.success(res, result.logs, 'Audit logs retrieved', 200, result.pagination);
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching audit logs', 500, err.message);
    }
  }

  static async getRequestAudit(req, res) {
    try {
      const { requestId } = req.params;
      const logs = await AuditService.getAuditHistory(requestId);
      return ApiResponse.success(res, logs, 'Request audit trail retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching request audit trail', 500, err.message);
    }
  }
}

module.exports = AuditController;
