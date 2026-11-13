const Request = require('../models/Request');
const ExecutionHistory = require('../models/ExecutionHistory');
const AuditService = require('../services/audit/auditService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class ReviewController {
  /**
   * GET /api/reviews
   * Retrieve all requests awaiting manual underwriter review
   */
  static async getReviewQueue(req, res) {
    try {
      const { workflowCode, page = 1, limit = 20 } = req.query;
      const filter = { status: 'MANUAL_REVIEW' };
      if (workflowCode) filter.workflowCode = workflowCode.toUpperCase();

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const [requests, total] = await Promise.all([
        Request.find(filter)
          .sort({ createdAt: 1 }) // FIFO queue for reviewers
          .skip(skip)
          .limit(parseInt(limit, 10))
          .populate('submittedBy', 'fullName username email')
          .lean(),
        Request.countDocuments(filter)
      ]);

      return ApiResponse.success(
        res,
        requests,
        'Manual review queue retrieved',
        200,
        {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10))
        }
      );
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching review queue', 500, err.message);
    }
  }

  /**
   * POST /api/reviews/:id/approve
   * Race-condition safe atomic approval
   */
  static async approve(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const reviewer = req.user;

      // Atomic find and transition to avoid concurrent adjudication races
      const request = await Request.findOneAndUpdate(
        {
          $or: [
            { requestId: id, status: 'MANUAL_REVIEW' },
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null, status: 'MANUAL_REVIEW' }
          ]
        },
        {
          $set: {
            previousStatus: 'MANUAL_REVIEW',
            status: 'APPROVED',
            currentStage: 'COMPLETED',
            lastSuccessfulStage: 'MANUAL_REVIEW',
            reviewedBy: reviewer._id,
            reviewerNotes: notes || 'Approved by underwriter',
            reviewedAt: new Date()
          }
        },
        { new: true }
      );

      if (!request) {
        // Check if request exists in a different state
        const existing = await Request.findOne({
          $or: [{ requestId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
        });
        if (!existing) {
          return ApiResponse.error(res, 'Request not found', 404);
        }
        return ApiResponse.error(
          res,
          `Cannot review request: current state is '${existing.status}', expected 'MANUAL_REVIEW'`,
          409,
          null,
          'INVALID_REVIEW_STATE'
        );
      }

      await ExecutionHistory.create({
        requestId: request.requestId,
        fromStage: 'MANUAL_REVIEW',
        toStage: 'COMPLETED',
        fromStatus: 'MANUAL_REVIEW',
        toStatus: 'APPROVED',
        reason: `Manually approved by ${reviewer.fullName} (${reviewer.username}): ${notes}`,
        triggeredBy: reviewer.username,
        timestamp: new Date()
      });

      await AuditService.recordEvent({
        requestId: request.requestId,
        eventType: 'MANUAL_REVIEW_SUBMITTED',
        stage: 'MANUAL_REVIEW',
        actor: reviewer.username,
        actorRole: reviewer.role,
        details: {
          action: 'APPROVED',
          reviewerId: reviewer._id,
          reviewerName: reviewer.fullName,
          notes
        }
      });

      logger.info(`[REVIEW] Request ${request.requestId} APPROVED by ${reviewer.username}`);
      return ApiResponse.success(res, request, 'Request approved successfully');
    } catch (err) {
      return ApiResponse.error(res, 'Error processing review approval', 500, err.message);
    }
  }

  /**
   * POST /api/reviews/:id/reject
   * Race-condition safe atomic rejection
   */
  static async reject(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const reviewer = req.user;

      const request = await Request.findOneAndUpdate(
        {
          $or: [
            { requestId: id, status: 'MANUAL_REVIEW' },
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null, status: 'MANUAL_REVIEW' }
          ]
        },
        {
          $set: {
            previousStatus: 'MANUAL_REVIEW',
            status: 'REJECTED',
            currentStage: 'COMPLETED',
            reviewedBy: reviewer._id,
            reviewerNotes: notes || 'Rejected by underwriter',
            reviewedAt: new Date()
          }
        },
        { new: true }
      );

      if (!request) {
        const existing = await Request.findOne({
          $or: [{ requestId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
        });
        if (!existing) {
          return ApiResponse.error(res, 'Request not found', 404);
        }
        return ApiResponse.error(
          res,
          `Cannot review request: current state is '${existing.status}', expected 'MANUAL_REVIEW'`,
          409,
          null,
          'INVALID_REVIEW_STATE'
        );
      }

      await ExecutionHistory.create({
        requestId: request.requestId,
        fromStage: 'MANUAL_REVIEW',
        toStage: 'COMPLETED',
        fromStatus: 'MANUAL_REVIEW',
        toStatus: 'REJECTED',
        reason: `Manually rejected by ${reviewer.fullName} (${reviewer.username}): ${notes}`,
        triggeredBy: reviewer.username,
        timestamp: new Date()
      });

      await AuditService.recordEvent({
        requestId: request.requestId,
        eventType: 'MANUAL_REVIEW_SUBMITTED',
        stage: 'MANUAL_REVIEW',
        actor: reviewer.username,
        actorRole: reviewer.role,
        details: {
          action: 'REJECTED',
          reviewerId: reviewer._id,
          reviewerName: reviewer.fullName,
          notes
        }
      });

      logger.info(`[REVIEW] Request ${request.requestId} REJECTED by ${reviewer.username}`);
      return ApiResponse.success(res, request, 'Request rejected successfully');
    } catch (err) {
      return ApiResponse.error(res, 'Error processing review rejection', 500, err.message);
    }
  }
}

module.exports = ReviewController;
