const Rule = require('../models/Rule');
const RuleConfigService = require('../services/rules/ruleConfigService');
const ApiResponse = require('../utils/apiResponse');

class RuleController {
  static async getRules(req, res) {
    try {
      const { workflowCode, isActive } = req.query;
      const filter = {};
      if (workflowCode) filter.workflowCode = workflowCode.toUpperCase();
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      const rules = await Rule.find(filter)
        .populate('createdBy', 'fullName username email')
        .sort({ workflowCode: 1, priority: 1 })
        .lean();

      return ApiResponse.success(res, rules, 'Rules retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching rules', 500, err.message);
    }
  }

  static async getRuleById(req, res) {
    try {
      const { id } = req.params;
      const rule = await Rule.findOne({
        $or: [{ ruleCode: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
        .populate('createdBy', 'fullName username email')
        .lean();

      if (!rule) {
        return ApiResponse.error(res, 'Rule not found', 404);
      }

      const versions = await RuleConfigService.getRuleVersions(rule.ruleCode);
      return ApiResponse.success(res, { ...rule, versions }, 'Rule details retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching rule', 500, err.message);
    }
  }

  static async createRule(req, res) {
    try {
      const existing = await Rule.findOne({ ruleCode: req.body.ruleCode.toUpperCase() });
      if (existing) {
        return ApiResponse.error(res, `Rule with code '${req.body.ruleCode}' already exists`, 409);
      }

      const rule = await RuleConfigService.createRule(req.body, req.user._id);
      return ApiResponse.success(res, rule, 'Rule created successfully', 201);
    } catch (err) {
      return ApiResponse.error(res, 'Error creating rule', 500, err.message);
    }
  }

  static async updateRule(req, res) {
    try {
      const { id } = req.params;
      const updated = await RuleConfigService.updateRule(id, req.body, req.user._id, req.body.changeSummary);
      return ApiResponse.success(res, updated, 'Rule updated and version incremented');
    } catch (err) {
      return ApiResponse.error(res, 'Error updating rule', 500, err.message);
    }
  }

  static async activateRule(req, res) {
    try {
      const { id } = req.params;
      const { isActive = true } = req.body;
      const updated = await RuleConfigService.toggleActivation(id, isActive);
      return ApiResponse.success(res, updated, `Rule ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      return ApiResponse.error(res, 'Error toggling rule activation', 500, err.message);
    }
  }

  static async getVersions(req, res) {
    try {
      const { id } = req.params;
      const versions = await RuleConfigService.getRuleVersions(id.toUpperCase());
      return ApiResponse.success(res, versions, 'Rule versions retrieved');
    } catch (err) {
      return ApiResponse.error(res, 'Error fetching rule versions', 500, err.message);
    }
  }
}

module.exports = RuleController;
