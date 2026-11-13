const AuditLog = require('../../models/AuditLog');
const logger = require('../../utils/logger');

class AuditService {
  /**
   * Append an immutable audit event
   */
  static async recordEvent({
    requestId,
    eventType,
    stage,
    details = {},
    actor = 'SYSTEM',
    actorRole = 'SYSTEM'
  }) {
    try {
      const log = new AuditLog({
        requestId,
        eventType,
        stage,
        details,
        actor,
        actorRole,
        timestamp: new Date()
      });
      await log.save();
      logger.info(`[AUDIT] ${eventType} for ${requestId} at stage ${stage}`);
      return log;
    } catch (err) {
      logger.error(`Failed to write audit log for ${requestId}: ${err.message}`, err);
      // We do not throw here to prevent auditing failure from aborting primary transactions,
      // but in strict audit environments we log critical alert
      return null;
    }
  }

  /**
   * Retrieve complete audit trail for a request
   */
  static async getAuditHistory(requestId) {
    return AuditLog.find({ requestId })
      .sort({ timestamp: 1 })
      .lean();
  }

  /**
   * Retrieve system-wide audit logs with filters and pagination
   */
  static async getSystemLogs({ eventType, stage, limit = 50, page = 1 }) {
    const filter = {};
    if (eventType) filter.eventType = eventType;
    if (stage) filter.stage = stage;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    return {
      logs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = AuditService;
