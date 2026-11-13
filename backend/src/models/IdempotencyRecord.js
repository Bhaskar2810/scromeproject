const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    requestId: {
      type: String,
      index: true
    },
    requestHash: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
      index: true
    },
    statusCode: {
      type: Number
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // TTL 24 hours
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
