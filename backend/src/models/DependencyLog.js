const mongoose = require('mongoose');

const dependencyLogSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      index: true
    },
    serviceName: {
      type: String,
      required: true,
      default: 'CreditVerificationBureau'
    },
    endpoint: {
      type: String,
      default: '/verify'
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1
    },
    isSuccess: {
      type: Boolean,
      required: true
    },
    statusCode: {
      type: Number
    },
    durationMs: {
      type: Number,
      default: 0
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed
    },
    errorMessage: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

dependencyLogSchema.index({ serviceName: 1, isSuccess: 1, createdAt: -1 });

module.exports = mongoose.model('DependencyLog', dependencyLogSchema);
