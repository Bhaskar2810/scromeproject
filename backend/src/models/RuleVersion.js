const mongoose = require('mongoose');

const ruleVersionSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rule',
      required: true
    },
    ruleCode: {
      type: String,
      required: true,
      uppercase: true
    },
    workflowCode: {
      type: String,
      required: true,
      uppercase: true
    },
    version: {
      type: Number,
      required: true
    },
    name: String,
    priority: Number,
    conditions: mongoose.Schema.Types.Mixed,
    action: {
      outcome: String,
      reason: String
    },
    changeSummary: {
      type: String,
      default: 'Rule version snapshot created'
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

ruleVersionSchema.index({ ruleCode: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('RuleVersion', ruleVersionSchema);
