const Workflow = require('../models/Workflow');
const WorkflowService = require('../services/workflow/workflowService');
const ApiResponse = require('../utils/apiResponse');

class WorkflowController {
  static async getWorkflows(req, res) {
    try {
      const { category, isActive } = req.query;
      const filter = {};
      if (category) filter.category = category;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      const workflows = await Workflow.find(filter)
        .populate('createdBy', 'fullName username email')
        .sort({ createdAt: -1 })
        .lean();

      return ApiResponse.success(res, workflows, 'Workflows retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching workflows', 500, err.message);
    }
  }

  static async getWorkflowById(req, res) {
    try {
      const { id } = req.params;
      const workflow = await Workflow.findOne({
        $or: [{ code: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
        .populate('createdBy', 'fullName username email')
        .lean();

      if (!workflow) {
        return ApiResponse.error(res, 'Workflow not found', 404);
      }

      const versions = await WorkflowService.getWorkflowVersions(workflow.code);

      return ApiResponse.success(res, { ...workflow, versions }, 'Workflow retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching workflow', 500, err.message);
    }
  }

  static async createWorkflow(req, res) {
    try {
      const existing = await Workflow.findOne({ code: req.body.code.toUpperCase() });
      if (existing) {
        return ApiResponse.error(res, `Workflow with code '${req.body.code}' already exists`, 409);
      }

      const workflow = await WorkflowService.createWorkflow(req.body, req.user._id);
      return ApiResponse.success(res, workflow, 'Workflow created successfully', 201);
    } catch (err) {
      return ApiResponse.error(res, 'Error creating workflow', 500, err.message);
    }
  }

  static async updateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const updated = await WorkflowService.updateWorkflow(id, req.body, req.user._id, req.body.changeSummary);
      return ApiResponse.success(res, updated, 'Workflow updated and version incremented');
    } catch (err) {
      return ApiResponse.error(res, 'Error updating workflow', 500, err.message);
    }
  }

  static async activateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { isActive = true } = req.body;
      const updated = await WorkflowService.toggleActivation(id, isActive);
      return ApiResponse.success(res, updated, `Workflow ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      return ApiResponse.error(res, 'Error toggling workflow activation', 500, err.message);
    }
  }

  static async getVersions(req, res) {
    try {
      const { id } = req.params;
      const versions = await WorkflowService.getWorkflowVersions(id.toUpperCase());
      return ApiResponse.success(res, versions, 'Workflow versions retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error retrieving versions', 500, err.message);
    }
  }
}

module.exports = WorkflowController;
