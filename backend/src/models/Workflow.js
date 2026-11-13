const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true }
}, { _id: false });

const transitionSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  condition: { type: String }, // e.g. 'VALIDATION_PASSED', 'RULE_AUTO_APPROVE', 'RULE_REJECT', 'RULE_MANUAL_REVIEW', 'MANUAL_APPROVE', 'EXTERNAL_FAIL_RETRY'
  description: { type: String }
}, { _id: false });

const workflowSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
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
    category: {
      type: String,
      enum: ['FINANCE', 'INSURANCE', 'HR', 'PROCUREMENT', 'COMPLIANCE', 'GENERAL'],
      default: 'FINANCE'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    currentVersion: {
      type: Number,
      default: 1
    },
    initialStage: {
      type: String,
      default: 'INITIALIZED'
    },
    stages: {
      type: [stageSchema],
      default: [
        { name: 'INITIALIZED', displayName: 'Initialized', order: 1 },
        { name: 'VALIDATION', displayName: 'Schema Validation', order: 2 },
        { name: 'RULE_EVALUATION', displayName: 'Business Rules Engine', order: 3 },
        { name: 'EXTERNAL_VERIFICATION', displayName: 'External Service Verification', order: 4 },
        { name: 'MANUAL_REVIEW', displayName: 'Manual Underwriter Review', order: 5 },
        { name: 'COMPLETED', displayName: 'Finalized Decision', order: 6 }
      ]
    },
    transitions: {
      type: [transitionSchema],
      default: [
        { from: 'INITIALIZED', to: 'VALIDATION', condition: 'START_PROCESS' },
        { from: 'VALIDATION', to: 'RULE_EVALUATION', condition: 'VALIDATION_SUCCESS' },
        { from: 'VALIDATION', to: 'FAILED', condition: 'VALIDATION_FAILED' },
        { from: 'RULE_EVALUATION', to: 'EXTERNAL_VERIFICATION', condition: 'RULE_PROCEED_EXTERNAL' },
        { from: 'RULE_EVALUATION', to: 'APPROVED', condition: 'RULE_AUTO_APPROVE' },
        { from: 'RULE_EVALUATION', to: 'REJECTED', condition: 'RULE_REJECT' },
        { from: 'RULE_EVALUATION', to: 'MANUAL_REVIEW', condition: 'RULE_MANUAL_REVIEW' },
        { from: 'EXTERNAL_VERIFICATION', to: 'APPROVED', condition: 'EXTERNAL_SUCCESS' },
        { from: 'EXTERNAL_VERIFICATION', to: 'RETRY_PENDING', condition: 'EXTERNAL_TRANSIENT_ERROR' },
        { from: 'RETRY_PENDING', to: 'EXTERNAL_VERIFICATION', condition: 'EXECUTE_RETRY' },
        { from: 'RETRY_PENDING', to: 'FAILED', condition: 'RETRIES_EXHAUSTED' },
        { from: 'MANUAL_REVIEW', to: 'APPROVED', condition: 'REVIEWER_APPROVE' },
        { from: 'MANUAL_REVIEW', to: 'REJECTED', condition: 'REVIEWER_REJECT' }
      ]
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

workflowSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('Workflow', workflowSchema);
