const mongoose = require('mongoose');

const conditionCriterionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    required: true,
    enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'not_in', 'exists', 'contains']
  },
  value: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const conditionGroupSchema = new mongoose.Schema({
  operator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },
  rules: [conditionCriterionSchema]
}, { _id: false });

const ruleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    workflowCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    priority: {
      type: Number,
      default: 10,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    version: {
      type: Number,
      default: 1
    },
    conditions: {
      type: conditionGroupSchema,
      required: true
    },
    action: {
      outcome: {
        type: String,
        enum: ['AUTO_APPROVE', 'MANUAL_REVIEW', 'REJECT', 'NEXT_STAGE'],
        required: true
      },
      reason: {
        type: String,
        required: true
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

ruleSchema.index({ workflowCode: 1, isActive: 1, priority: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
