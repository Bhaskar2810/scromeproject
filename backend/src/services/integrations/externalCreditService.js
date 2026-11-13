const DependencyLog = require('../../models/DependencyLog');
const AuditService = require('../audit/auditService');
const env = require('../../config/env');
const logger = require('../../utils/logger');

class ExternalCreditService {
  constructor() {
    this.failureRate = env.EXTERNAL_SERVICE_FAILURE_RATE;
    this.timeoutMs = env.EXTERNAL_SERVICE_TIMEOUT_MS;
    this.forceMode = null; // 'SUCCESS' | 'FAIL' | 'TIMEOUT' | 'INTERMITTENT'
    this.callCount = 0;
  }

  setChaosConfig({ failureRate, forceMode, timeoutMs }) {
    if (failureRate !== undefined) this.failureRate = parseFloat(failureRate);
    if (forceMode !== undefined) this.forceMode = forceMode;
    if (timeoutMs !== undefined) this.timeoutMs = parseInt(timeoutMs, 10);
    logger.info(`[EXTERNAL SERVICE] Chaos config updated: failureRate=${this.failureRate}, forceMode=${this.forceMode}, timeoutMs=${this.timeoutMs}`);
  }

  getChaosConfig() {
    return {
      serviceName: 'CreditVerificationBureau',
      failureRate: this.failureRate,
      forceMode: this.forceMode,
      timeoutMs: this.timeoutMs,
      totalCalls: this.callCount
    };
  }

  /**
   * Verify creditworthiness of applicant with simulated latency and fault injection
   */
  async verifyCredit({ requestId, applicantName, taxId, requestedAmount, statedIncome }, attemptNumber = 1) {
    this.callCount++;
    const startTime = Date.now();
    const serviceName = 'CreditVerificationBureau';
    const endpoint = '/api/v1/credit-check';
    const requestPayload = { applicantName, taxId: taxId ? '***-**-****' : 'N/A', requestedAmount, statedIncome };

    await AuditService.recordEvent({
      requestId,
      eventType: 'EXTERNAL_CALL_ATTEMPTED',
      stage: 'EXTERNAL_VERIFICATION',
      details: { serviceName, endpoint, attemptNumber, requestPayload }
    });

    // Determine outcome based on configuration & chaos mode
    let shouldFail = false;
    let shouldTimeout = false;
    let failureReason = '';

    if (this.forceMode === 'TIMEOUT') {
      shouldTimeout = true;
      failureReason = 'Credit Bureau gateway timeout (forced)';
    } else if (this.forceMode === 'FAIL') {
      shouldFail = true;
      failureReason = 'Credit Bureau service unavailable (forced HTTP 503)';
    } else if (this.forceMode === 'SUCCESS') {
      shouldFail = false;
    } else if (this.forceMode === 'INTERMITTENT') {
      // Fails on attempt 1, succeeds on attempt >= 2
      if (attemptNumber === 1) {
        shouldFail = true;
        failureReason = 'Simulated transient network drop on attempt 1';
      } else {
        shouldFail = false;
      }
    } else {
      // Probabilistic failure
      if (Math.random() < this.failureRate) {
        shouldFail = true;
        failureReason = 'Upstream credit provider timeout or transient rate limit';
      }
    }

    // Simulate network delay (50ms to 200ms)
    const simulatedLatency = shouldTimeout ? this.timeoutMs + 100 : Math.floor(Math.random() * 150) + 50;
    await new Promise((resolve) => setTimeout(resolve, simulatedLatency));

    const durationMs = Date.now() - startTime;

    if (shouldTimeout || shouldFail) {
      const errorMsg = shouldTimeout ? `Request timed out after ${durationMs}ms` : failureReason;
      
      await DependencyLog.create({
        requestId,
        serviceName,
        endpoint,
        attemptNumber,
        isSuccess: false,
        statusCode: shouldTimeout ? 504 : 503,
        durationMs,
        requestPayload,
        responsePayload: null,
        errorMessage: errorMsg
      });

      await AuditService.recordEvent({
        requestId,
        eventType: 'EXTERNAL_CALL_FAILED',
        stage: 'EXTERNAL_VERIFICATION',
        details: { serviceName, endpoint, attemptNumber, durationMs, errorMessage: errorMsg }
      });

      const error = new Error(`External Dependency Failure: ${errorMsg}`);
      error.isTransient = true;
      error.statusCode = shouldTimeout ? 504 : 503;
      throw error;
    }

    // Success response
    const creditScore =
      this.forceMode === 'SUCCESS' || this.forceMode === 'INTERMITTENT'
        ? 780
        : Math.floor(Math.random() * (850 - 680 + 1)) + 680;
    const responsePayload = {
      bureauReferenceId: `BUREAU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      verified: true,
      creditScore,
      riskTier: creditScore >= 750 ? 'LOW' : creditScore >= 680 ? 'MEDIUM' : 'HIGH',
      debtToIncomeRatio: +(Math.random() * (0.45 - 0.15) + 0.15).toFixed(2),
      verificationTimestamp: new Date().toISOString()
    };

    await DependencyLog.create({
      requestId,
      serviceName,
      endpoint,
      attemptNumber,
      isSuccess: true,
      statusCode: 200,
      durationMs,
      requestPayload,
      responsePayload
    });

    await AuditService.recordEvent({
      requestId,
      eventType: 'EXTERNAL_CALL_SUCCESS',
      stage: 'EXTERNAL_VERIFICATION',
      details: { serviceName, endpoint, attemptNumber, durationMs, responsePayload }
    });

    return responsePayload;
  }
}

const externalCreditService = new ExternalCreditService();
module.exports = externalCreditService;
