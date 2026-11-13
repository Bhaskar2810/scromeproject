const Workflow = require('../../models/Workflow');
const WorkflowVersion = require('../../models/WorkflowVersion');
const logger = require('../../utils/logger');

class WorkflowService {
  static async createWorkflow(data, userId) {
    const workflow = new Workflow({
      ...data,
      currentVersion: 1,
      createdBy: userId
    });
    await workflow.save();

    // Create initial version snapshot
    await WorkflowVersion.create({
      workflowId: workflow._id,
      workflowCode: workflow.code,
      version: 1,
      name: workflow.name,
      description: workflow.description,
      stages: workflow.stages,
      transitions: workflow.transitions,
      changeSummary: 'Initial workflow creation',
      publishedBy: userId
    });

    return workflow;
  }

  static async updateWorkflow(id, updateData, userId, changeSummary = 'Configuration updated') {
    const workflow = await Workflow.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Increment version when stages or transitions change
    const newVersion = workflow.currentVersion + 1;
    workflow.name = updateData.name || workflow.name;
    workflow.description = updateData.description !== undefined ? updateData.description : workflow.description;
    workflow.category = updateData.category || workflow.category;
    if (updateData.stages) workflow.stages = updateData.stages;
    if (updateData.transitions) workflow.transitions = updateData.transitions;
    workflow.currentVersion = newVersion;

    await workflow.save();

    // Record version snapshot
    await WorkflowVersion.create({
      workflowId: workflow._id,
      workflowCode: workflow.code,
      version: newVersion,
      name: workflow.name,
      description: workflow.description,
      stages: workflow.stages,
      transitions: workflow.transitions,
      changeSummary,
      publishedBy: userId
    });

    logger.info(`[WORKFLOW] Workflow ${workflow.code} updated to version ${newVersion}`);
    return workflow;
  }

  static async toggleActivation(id, isActive) {
    const workflow = await Workflow.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    );
    return workflow;
  }

  static async getWorkflowVersions(workflowCode) {
    return WorkflowVersion.find({ workflowCode })
      .sort({ version: -1 })
      .populate('publishedBy', 'fullName username email')
      .lean();
  }
}

module.exports = WorkflowService;
