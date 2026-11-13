const mongoose = require('mongoose');

const workflowVersionSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true
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
    name: {
      type: String,
      required: true
    },
    description: String,
    stages: [
      {
        name: String,
        displayName: String,
        description: String,
        order: Number
      }
    ],
    transitions: [
      {
        from: String,
        to: String,
        condition: String,
        description: String
      }
    ],
    changeSummary: {
      type: String,
      default: 'Version snapshot created'
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

workflowVersionSchema.index({ workflowCode: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('WorkflowVersion', workflowVersionSchema);
