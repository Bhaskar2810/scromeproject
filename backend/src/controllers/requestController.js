const crypto = require('crypto');
const Request = require('../models/Request');
const ExecutionHistory = require('../models/ExecutionHistory');
const DependencyLog = require('../models/DependencyLog');
const IdempotencyService = require('../services/idempotency/idempotencyService');
const WorkflowEngine = require('../services/workflow/workflowEngine');
const AuditService = require('../services/audit/auditService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class RequestController {
  /**
   * POST /api/requests
   * Intake business requests with schema validation and idempotency handling
   */
  static async createRequest(req, res) {
    const { workflowCode, idempotencyKey, payload, metadata = {} } = req.body;
    const actorId = req.user?._id;
    const actorName = req.user?.username || 'ANONYMOUS';

    // 1. Structural / Intake Validation before creating or executing
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length === 0) {
      return ApiResponse.error(res, 'Request payload cannot be empty or malformed', 400, ['Payload object is required'], 'VALIDATION_FAILED');
    }

    if (!workflowCode || typeof workflowCode !== 'string' || workflowCode.trim() === '') {
      return ApiResponse.error(res, 'workflowCode is mandatory', 400, ['workflowCode cannot be empty'], 'VALIDATION_FAILED');
    }

    // For Retail Loan application approval workflow, validate core mandatory intake schema
    const validation = WorkflowEngine.validatePayload(payload);
    if (!validation.valid) {
      return ApiResponse.error(
        res,
        `Input validation failed: ${validation.errors.join(', ')}`,
        400,
        validation.errors,
        'VALIDATION_FAILED'
      );
    }

    // 2. Generate unique request identifier
    const uniqueHash = crypto.randomBytes(3).toString('hex').toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const requestId = `REQ-${dateStr}-${uniqueHash}`;

    // 3. Idempotency Check
    if (idempotencyKey) {
      const idempResult = await IdempotencyService.checkOrLock(idempotencyKey, requestId, payload);
      if (idempResult.isDuplicate) {
        if (idempResult.status === 'COMPLETED') {
          return res.status(idempResult.statusCode || 200).json({
            ...idempResult.responseBody,
            _idempotency: { key: idempotencyKey, cached: true }
          });
        }
        if (idempResult.status === 'PROCESSING') {
          return ApiResponse.error(
            res,
            'A request with this idempotency key is currently processing. Please try again shortly.',
            409,
            null,
            'IDEMPOTENCY_IN_PROGRESS'
          );
        }
        if (idempResult.status === 'FAILED') {
          return res.status(idempResult.statusCode || 500).json({
            ...idempResult.responseBody,
            _idempotency: { key: idempotencyKey, cached: true, failed: true }
          });
        }
      }
    }

    try {
      const newRequest = new Request({
        requestId,
        idempotencyKey,
        workflowCode: workflowCode.toUpperCase(),
        status: 'INITIALIZED',
        currentStage: 'INITIALIZED',
        payload,
        metadata: {
          ...metadata,
          clientIp: req.ip,
          userAgent: req.get('user-agent')
        },
        submittedBy: actorId
      });

      await newRequest.save();

      await AuditService.recordEvent({
        requestId,
        eventType: 'REQUEST_CREATED',
        stage: 'INITIALIZED',
        actor: actorName,
        actorRole: req.user?.role || 'API_USER',
        details: { workflowCode, idempotencyKey, payloadSummary: { applicant: payload.applicantName, amount: payload.amount } }
      });

      // 4. Execute the workflow pipeline
      const executed = await WorkflowEngine.execute(requestId);

      const responseData = {
        requestId: executed.requestId,
        status: executed.status,
        currentStage: executed.currentStage,
        workflowCode: executed.workflowCode,
        workflowVersion: executed.workflowVersion,
        evaluationSummary: executed.evaluationSummary,
        createdAt: executed.createdAt,
        updatedAt: executed.updatedAt
      };

      // 5. Mark idempotency record as complete
      if (idempotencyKey) {
        await IdempotencyService.markComplete(idempotencyKey, 201, {
          success: true,
          message: 'Request submitted and processed',
          data: responseData
        });
      }

      return ApiResponse.success(res, responseData, 'Request submitted and processed', 201);
    } catch (err) {
      logger.error(`Error processing request intake for ${requestId}: ${err.message}`, err);

      if (idempotencyKey) {
        await IdempotencyService.markFailed(idempotencyKey, err.message);
      }

      return ApiResponse.error(
        res,
        `Failed to execute request: ${err.message}`,
        500,
        process.env.NODE_ENV === 'development' ? err.stack : undefined,
        'EXECUTION_ERROR'
      );
    }
  }

  /**
   * GET /api/requests
   * Filter, search, paginate, sort requests
   */
  static async getRequests(req, res) {
    try {
      const {
        status,
        workflowCode,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};
      if (status) filter.status = String(status);
      if (workflowCode) filter.workflowCode = String(workflowCode).toUpperCase();
      if (search && typeof search === 'string') {
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { requestId: { $regex: sanitizedSearch, $options: 'i' } },
          { 'payload.applicantName': { $regex: sanitizedSearch, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [requests, total] = await Promise.all([
        Request.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit, 10))
          .populate('reviewedBy', 'fullName username email')
          .lean(),
        Request.countDocuments(filter)
      ]);

      return ApiResponse.success(
        res,
        requests,
        'Requests retrieved',
        200,
        {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10))
        }
      );
    } catch (err) {
      return ApiResponse.error(res, 'Error retrieving requests', 500, err.message);
    }
  }

  /**
   * GET /api/requests/:id
   */
  static async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const request = await Request.findOne({
        $or: [{ requestId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
        .populate('submittedBy', 'fullName username email')
        .populate('reviewedBy', 'fullName username email')
        .lean();

      if (!request) {
        return ApiResponse.error(res, 'Request not found', 404);
      }

      const [history, auditTrail, dependencyLogs] = await Promise.all([
        ExecutionHistory.find({ requestId: request.requestId }).sort({ timestamp: 1 }).lean(),
        AuditService.getAuditHistory(request.requestId),
        DependencyLog.find({ requestId: request.requestId }).sort({ createdAt: 1 }).lean()
      ]);

      return ApiResponse.success(
        res,
        {
          ...request,
          executionHistory: history,
          auditTrail,
          dependencyLogs
        },
        'Request details retrieved'
      );
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching request details', 500, err.message);
    }
  }

  /**
   * POST /api/requests/:id/execute
   * Re-execute in-flight or failed requests; rejects terminal executions
   */
  static async executeRequest(req, res) {
    try {
      const { id } = req.params;
      const request = await Request.findOne({
        $or: [{ requestId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      });

      if (!request) {
        return ApiResponse.error(res, 'Request not found', 404);
      }

      // Guard: Disallow re-executing finalized terminal states
      if (request.status === 'APPROVED' || request.status === 'REJECTED') {
        return ApiResponse.error(
          res,
          `Cannot re-execute request in terminal state '${request.status}'`,
          400,
          null,
          'INVALID_STATE_TRANSITION'
        );
      }

      const updated = await WorkflowEngine.execute(request.requestId);
      return ApiResponse.success(res, updated, 'Workflow executed successfully');
    } catch (err) {
      return ApiResponse.error(res, `Workflow execution failed: ${err.message}`, 500);
    }
  }

  /**
   * GET /api/requests/:id/explanation
   * Return explainable decision analysis
   */
  static async getExplanation(req, res) {
    try {
      const { id } = req.params;
      const request = await Request.findOne({
        $or: [{ requestId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      }).lean();

      if (!request) {
        return ApiResponse.error(res, 'Request not found', 404);
      }

      const summary = request.evaluationSummary || {};
      const rules = summary.ruleResults || [];

      const triggeredRules = rules.filter((r) => r.matched);
      const skippedRules = rules.filter((r) => !r.matched);

      const explanation = {
        requestId: request.requestId,
        finalDecision: request.status,
        overallOutcome: summary.outcome || request.status,
        summaryReason: summary.reason || request.status,
        rulesEvaluatedCount: summary.rulesEvaluatedCount || rules.length,
        rulesTriggeredCount: triggeredRules.length,
        rulesTriggered: triggeredRules,
        rulesSkipped: skippedRules,
        reviewedBy: request.reviewedBy,
        reviewerNotes: request.reviewerNotes,
        reviewedAt: request.reviewedAt
      };

      return ApiResponse.success(res, explanation, 'Decision explanation retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error generating explanation', 500, err.message);
    }
  }

  /**
   * GET /api/requests/:id/history
   */
  static async getHistory(req, res) {
    try {
      const { id } = req.params;
      const history = await ExecutionHistory.find({ requestId: id }).sort({ timestamp: 1 }).lean();
      return ApiResponse.success(res, history, 'Stage history retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching history', 500, err.message);
    }
  }
}

module.exports = RequestController;
