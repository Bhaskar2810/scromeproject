const crypto = require('crypto');
const IdempotencyRecord = require('../../models/IdempotencyRecord');
const logger = require('../../utils/logger');

class IdempotencyService {
  static generateHash(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Check or acquire lock for an idempotency key
   * Returns: { isDuplicate: boolean, cachedResponse?: object, status?: string }
   */
  static async checkOrLock(idempotencyKey, requestId, payload) {
    if (!idempotencyKey) {
      return { isDuplicate: false };
    }

    const requestHash = this.generateHash(payload);

    try {
      const existing = await IdempotencyRecord.findOne({ idempotencyKey });
      if (existing) {
        if (existing.status === 'COMPLETED') {
          logger.info(`[IDEMPOTENCY] Cache hit for key: ${idempotencyKey}`);
          return {
            isDuplicate: true,
            status: 'COMPLETED',
            statusCode: existing.statusCode || 200,
            responseBody: existing.responseBody,
            requestId: existing.requestId
          };
        }

        if (existing.status === 'PROCESSING') {
          logger.warn(`[IDEMPOTENCY] Concurrent in-flight request for key: ${idempotencyKey}`);
          return {
            isDuplicate: true,
            status: 'PROCESSING',
            requestId: existing.requestId
          };
        }

        if (existing.status === 'FAILED') {
          logger.warn(`[IDEMPOTENCY] Previous failure cached for key: ${idempotencyKey}`);
          return {
            isDuplicate: true,
            status: 'FAILED',
            statusCode: existing.statusCode || 500,
            responseBody: existing.responseBody,
            requestId: existing.requestId
          };
        }
      }

      // Create new lock record
      const record = new IdempotencyRecord({
        idempotencyKey,
        requestId,
        requestHash,
        status: 'PROCESSING'
      });
      await record.save();

      return { isDuplicate: false, record };
    } catch (err) {
      // E11000 duplicate key error means concurrent request inserted first
      if (err.code === 11000) {
        const existing = await IdempotencyRecord.findOne({ idempotencyKey });
        return {
          isDuplicate: true,
          status: existing ? existing.status : 'PROCESSING',
          statusCode: existing?.statusCode,
          responseBody: existing?.responseBody,
          requestId: existing?.requestId
        };
      }
      throw err;
    }
  }

  static async markComplete(idempotencyKey, statusCode, responseBody) {
    if (!idempotencyKey) return;
    try {
      await IdempotencyRecord.findOneAndUpdate(
        { idempotencyKey },
        {
          $set: {
            status: 'COMPLETED',
            statusCode,
            responseBody
          }
        }
      );
    } catch (err) {
      logger.error(`Error completing idempotency record for ${idempotencyKey}: ${err.message}`);
    }
  }

  static async markFailed(idempotencyKey, errorDetails) {
    if (!idempotencyKey) return;
    try {
      await IdempotencyRecord.findOneAndUpdate(
        { idempotencyKey },
        {
          $set: {
            status: 'FAILED',
            statusCode: 500,
            responseBody: { error: errorDetails }
          }
        }
      );
    } catch (err) {
      logger.error(`Error marking idempotency record failed for ${idempotencyKey}: ${err.message}`);
    }
  }
}

module.exports = IdempotencyService;
