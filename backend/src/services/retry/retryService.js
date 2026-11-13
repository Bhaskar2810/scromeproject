const env = require('../../config/env');
const AuditService = require('../audit/auditService');
const logger = require('../../utils/logger');

class RetryService {
  /**
   * Execute an async operation with exponential backoff and jitter
   * @param {Function} operation - () => Promise<any>
   * @param {Object} options
   *   requestId: string
   *   stage: string
   *   maxRetries: number
   *   baseDelayMs: number
   *   maxDelayMs: number
   *   onRetry: (attempt, error, nextDelayMs) => Promise<void>
   */
  static async executeWithRetry(operation, options = {}) {
    const {
      requestId,
      stage = 'EXTERNAL_VERIFICATION',
      maxRetries = env.MAX_RETRY_ATTEMPTS,
      baseDelayMs = env.RETRY_BASE_DELAY_MS,
      maxDelayMs = env.RETRY_MAX_DELAY_MS,
      onRetry = null
    } = options;

    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        attempt++;
        return await operation(attempt);
      } catch (error) {
        logger.warn(`[RETRY] Attempt ${attempt}/${maxRetries + 1} failed for ${requestId}: ${error.message}`);

        if (attempt > maxRetries) {
          logger.error(`[RETRY] Max retry attempts (${maxRetries}) exhausted for ${requestId}`);
          await AuditService.recordEvent({
            requestId,
            eventType: 'RETRY_EXHAUSTED',
            stage,
            details: {
              totalAttempts: attempt,
              maxRetries,
              finalErrorMessage: error.message
            }
          });
          error.retryExhausted = true;
          error.totalAttempts = attempt;
          throw error;
        }

        // Calculate exponential backoff with full jitter
        // delay = min(maxDelay, baseDelay * 2^(attempt - 1)) * (0.5 + Math.random() * 0.5)
        const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
        const jitter = 0.5 + Math.random() * 0.5;
        const delayMs = Math.round(exponentialDelay * jitter);

        await AuditService.recordEvent({
          requestId,
          eventType: 'RETRY_SCHEDULED',
          stage,
          details: {
            failedAttempt: attempt,
            nextAttempt: attempt + 1,
            delayMs,
            reason: error.message
          }
        });

        if (onRetry) {
          await onRetry(attempt, error, delayMs);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

module.exports = RetryService;
