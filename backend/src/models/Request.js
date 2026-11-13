const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true
    },
    workflowCode: {
      type: String,
      required: true,
      index: true,
      uppercase: true
    },
    workflowVersion: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      required: true,
      enum: [
        'INITIALIZED',
        'VALIDATION',
        'RULE_EVALUATION',
        'EXTERNAL_VERIFICATION',
        'MANUAL_REVIEW',
        'APPROVED',
        'REJECTED',
        'RETRY_PENDING',
        'FAILED',
        'COMPLETED'
      ],
      default: 'INITIALIZED',
      index: true
    },
    previousStatus: {
      type: String,
      default: null
    },
    currentStage: {
      type: String,
      default: 'INITIALIZED'
    },
    lastSuccessfulStage: {
      type: String,
      default: null
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    metadata: {
      clientIp: String,
      userAgent: String,
      source: { type: String, default: 'API' },
      tags: [String]
    },
    evaluationSummary: {
      outcome: String,
      reason: String,
      ruleResults: [
        {
          ruleCode: String,
          ruleName: String,
          priority: Number,
          version: Number,
          evaluated: Boolean,
          matched: Boolean,
          action: mongoose.Schema.Types.Mixed,
          explanation: String,
          evaluatedAt: Date
        }
      ],
      rulesEvaluatedCount: { type: Number, default: 0 },
      rulesTriggeredCount: { type: Number, default: 0 }
    },
    retryCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    errorDetails: {
      stage: String,
      code: String,
      message: String,
      details: mongoose.Schema.Types.Mixed,
      timestamp: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewerNotes: {
      type: String
    },
    reviewedAt: {
      type: Date
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ workflowCode: 1, status: 1 });

module.exports = mongoose.model('Request', requestSchema);
