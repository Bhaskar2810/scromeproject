const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'REQUEST_CREATED',
        'INPUT_VALIDATED',
        'INPUT_VALIDATION_FAILED',
        'STAGE_TRANSITION',
        'RULES_EVALUATION_STARTED',
        'RULES_EVALUATION_COMPLETED',
        'EXTERNAL_CALL_ATTEMPTED',
        'EXTERNAL_CALL_SUCCESS',
        'EXTERNAL_CALL_FAILED',
        'RETRY_SCHEDULED',
        'RETRY_EXHAUSTED',
        'MANUAL_REVIEW_SUBMITTED',
        'FINAL_DECISION_REACHED',
        'CONFIGURATION_SNAPSHOT_PINNED',
        'SYSTEM_ERROR'
      ],
      index: true
    },
    stage: {
      type: String,
      required: true
    },
    actor: {
      type: String,
      default: 'SYSTEM'
    },
    actorRole: {
      type: String,
      default: 'SYSTEM'
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // strictly append-only, no update timestamps
  }
);

// Prevent modifications at Mongoose middleware level for append-only integrity
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are append-only and cannot be updated.');
});
auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs are append-only and cannot be updated.');
});
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are append-only and cannot be updated.');
});

auditLogSchema.index({ requestId: 1, timestamp: 1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
