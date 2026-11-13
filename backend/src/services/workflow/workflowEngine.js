const Request = require('../../models/Request');
const Workflow = require('../../models/Workflow');
const ExecutionHistory = require('../../models/ExecutionHistory');
const RuleService = require('../rules/ruleService');
const ExternalCreditService = require('../integrations/externalCreditService');
const RetryService = require('../retry/retryService');
const AuditService = require('../audit/auditService');
const logger = require('../../utils/logger');

class WorkflowEngine {
  /**
   * Helper to execute and record a stage transition
   */
  static async transition(request, nextStage, nextStatus, reason = '', errorDetails = null) {
    const fromStage = request.currentStage;
    const fromStatus = request.status;
    const startTime = Date.now();

    request.previousStatus = fromStatus;
    request.status = nextStatus;
    request.currentStage = nextStage;
    if (['VALIDATION', 'RULE_EVALUATION', 'EXTERNAL_VERIFICATION', 'COMPLETED', 'APPROVED'].includes(nextStage)) {
      request.lastSuccessfulStage = nextStage;
    }
    if (errorDetails) {
      request.errorDetails = {
        stage: nextStage,
        code: errorDetails.code || 'WORKFLOW_ERROR',
        message: errorDetails.message,
        details: errorDetails.details,
        timestamp: new Date()
      };
    }

    await request.save();

    const durationMs = Date.now() - startTime;
    await ExecutionHistory.create({
      requestId: request.requestId,
      fromStage,
      toStage: nextStage,
      fromStatus,
      toStatus: nextStatus,
      reason,
      durationMs,
      errorDetails,
      triggeredBy: 'WORKFLOW_ENGINE',
      timestamp: new Date()
    });

    await AuditService.recordEvent({
      requestId: request.requestId,
      eventType: 'STAGE_TRANSITION',
      stage: nextStage,
      details: {
        fromStage,
        toStage: nextStage,
        fromStatus,
        toStatus: nextStatus,
        reason
      }
    });

    logger.info(`[WORKFLOW] Request ${request.requestId} transitioned: [${fromStage}/${fromStatus}] -> [${nextStage}/${nextStatus}] (${reason})`);
    return request;
  }

  /**
   * Validate request payload schema and mandatory fields
   */
  static validatePayload(payload) {
    const errors = [];
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      errors.push('Payload must be a valid JSON object');
      return { valid: false, errors };
    }
    if (!payload.applicantName || typeof payload.applicantName !== 'string' || payload.applicantName.trim() === '') {
      errors.push('applicantName is mandatory and must be a non-empty string');
    }
    if (payload.amount === undefined || typeof payload.amount !== 'number' || !Number.isFinite(payload.amount) || payload.amount <= 0) {
      errors.push('amount is mandatory and must be a positive finite number');
    } else if (payload.amount > 1000000000) {
      errors.push('amount exceeds maximum platform limit of 1,000,000,000');
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Primary workflow execution pipeline
   */
  static async execute(requestId, options = {}) {
    logger.info(`[WORKFLOW] Starting execution for request ${requestId}`);
    const request = await Request.findOne({ requestId });
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    // Step 0: Pin Workflow configuration version if not already pinned
    const workflow = await Workflow.findOne({ code: request.workflowCode, isActive: true });
    if (!workflow) {
      await this.transition(request, 'FAILED', 'FAILED', `Active workflow ${request.workflowCode} not found`);
      throw new Error(`Active workflow ${request.workflowCode} does not exist`);
    }

    if (!request.workflowVersion) {
      request.workflowVersion = workflow.currentVersion || 1;
      await request.save();
      await AuditService.recordEvent({
        requestId,
        eventType: 'CONFIGURATION_SNAPSHOT_PINNED',
        stage: request.currentStage,
        details: { workflowCode: workflow.code, pinnedVersion: request.workflowVersion }
      });
    }

    // Stage 1: VALIDATION
    await this.transition(request, 'VALIDATION', 'VALIDATION', 'Starting schema validation');
    const validation = this.validatePayload(request.payload);
    if (!validation.valid) {
      await AuditService.recordEvent({
        requestId,
        eventType: 'INPUT_VALIDATION_FAILED',
        stage: 'VALIDATION',
        details: { errors: validation.errors }
      });
      await this.transition(
        request,
        'FAILED',
        'FAILED',
        `Input validation failed: ${validation.errors.join(', ')}`,
        { code: 'VALIDATION_ERROR', message: validation.errors.join(', ') }
      );
      return request;
    }

    await AuditService.recordEvent({
      requestId,
      eventType: 'INPUT_VALIDATED',
      stage: 'VALIDATION',
      details: { status: 'PASSED' }
    });

    // Stage 2: RULE_EVALUATION
    await this.transition(request, 'RULE_EVALUATION', 'RULE_EVALUATION', 'Evaluating configurable business rules');
    const ruleSummary = await RuleService.evaluateRules(request.workflowCode, request.payload, requestId);
    request.evaluationSummary = ruleSummary;
    await request.save();

    // Handle Rule Outcomes:
    if (ruleSummary.outcome === 'REJECT') {
      await this.transition(
        request,
        'COMPLETED',
        'REJECTED',
        `Rejected by rule criteria: ${ruleSummary.reason}`
      );
      return request;
    }

    if (ruleSummary.outcome === 'MANUAL_REVIEW') {
      await this.transition(
        request,
        'MANUAL_REVIEW',
        'MANUAL_REVIEW',
        `Routed to manual review queue: ${ruleSummary.reason}`
      );
      return request;
    }

    // If AUTO_APPROVE or NEXT_STAGE, check if external verification is required
    const requiresExternalVerification = request.workflowCode === 'APPLICATION_APPROVAL' || request.workflowCode === 'LOAN_APPROVAL';

    if (requiresExternalVerification) {
      // Stage 3: EXTERNAL_VERIFICATION
      await this.transition(request, 'EXTERNAL_VERIFICATION', 'EXTERNAL_VERIFICATION', 'Contacting external Credit Bureau service');

      try {
        const creditResult = await RetryService.executeWithRetry(
          async (attempt) => {
            request.retryCount = attempt - 1;
            await request.save();
            return ExternalCreditService.verifyCredit(
              {
                requestId: request.requestId,
                applicantName: request.payload.applicantName,
                taxId: request.payload.taxId,
                requestedAmount: request.payload.amount,
                statedIncome: request.payload.income
              },
              attempt
            );
          },
          {
            requestId: request.requestId,
            stage: 'EXTERNAL_VERIFICATION',
            maxRetries: request.maxRetries || 3,
            onRetry: async (attempt, err, delayMs) => {
              await this.transition(
                request,
                'RETRY_PENDING',
                'RETRY_PENDING',
                `Attempt ${attempt} failed: ${err.message}. Waiting ${delayMs}ms for retry.`
              );
              // Back to EXTERNAL_VERIFICATION for next attempt
              await this.transition(
                request,
                'EXTERNAL_VERIFICATION',
                'EXTERNAL_VERIFICATION',
                `Executing retry attempt ${attempt + 1}`
              );
            }
          }
        );

        // Check bureau response
        if (creditResult.riskTier === 'HIGH') {
          await this.transition(
            request,
            'MANUAL_REVIEW',
            'MANUAL_REVIEW',
            `Credit Bureau returned HIGH risk tier (Credit Score: ${creditResult.creditScore}). Routed for manual review.`
          );
          return request;
        }

        // External verification passed
        await this.transition(
          request,
          'COMPLETED',
          'APPROVED',
          `Application approved. Rules passed and external credit verified (Credit Score: ${creditResult.creditScore}, Risk Tier: ${creditResult.riskTier}).`
        );
        return request;
      } catch (externalErr) {
        logger.error(`[WORKFLOW] External verification failed permanently for ${requestId}: ${externalErr.message}`);
        await this.transition(
          request,
          'FAILED',
          'FAILED',
          `External dependency failure: ${externalErr.message}`,
          { code: 'EXTERNAL_SERVICE_FAILURE', message: externalErr.message }
        );
        return request;
      }
    }

    // Default auto-approve if no external step needed
    await this.transition(
      request,
      'COMPLETED',
      'APPROVED',
      ruleSummary.reason || 'Automatically approved based on rule criteria'
    );
    return request;
  }
}

module.exports = WorkflowEngine;
