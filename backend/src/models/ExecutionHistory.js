const mongoose = require('mongoose');

const executionHistorySchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      index: true
    },
    fromStage: {
      type: String
    },
    toStage: {
      type: String,
      required: true
    },
    fromStatus: {
      type: String
    },
    toStatus: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    durationMs: {
      type: Number,
      default: 0
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed
    },
    triggeredBy: {
      type: String,
      default: 'SYSTEM'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

executionHistorySchema.index({ requestId: 1, timestamp: 1 });

module.exports = mongoose.model('ExecutionHistory', executionHistorySchema);
