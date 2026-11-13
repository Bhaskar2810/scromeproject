const Rule = require('../../models/Rule');
const RuleVersion = require('../../models/RuleVersion');
const logger = require('../../utils/logger');

class RuleConfigService {
  static async createRule(data, userId) {
    const rule = new Rule({
      ...data,
      version: 1,
      createdBy: userId
    });
    await rule.save();

    await RuleVersion.create({
      ruleId: rule._id,
      ruleCode: rule.ruleCode,
      workflowCode: rule.workflowCode,
      version: 1,
      name: rule.name,
      priority: rule.priority,
      conditions: rule.conditions,
      action: rule.action,
      changeSummary: 'Initial rule creation',
      publishedBy: userId
    });

    return rule;
  }

  static async updateRule(id, updateData, userId, changeSummary = 'Rule conditions or action updated') {
    const rule = await Rule.findById(id);
    if (!rule) {
      throw new Error('Rule not found');
    }

    const newVersion = (rule.version || 1) + 1;
    if (updateData.name) rule.name = updateData.name;
    if (updateData.description !== undefined) rule.description = updateData.description;
    if (updateData.priority !== undefined) rule.priority = updateData.priority;
    if (updateData.conditions) rule.conditions = updateData.conditions;
    if (updateData.action) rule.action = updateData.action;
    if (updateData.isActive !== undefined) rule.isActive = updateData.isActive;
    rule.version = newVersion;

    await rule.save();

    await RuleVersion.create({
      ruleId: rule._id,
      ruleCode: rule.ruleCode,
      workflowCode: rule.workflowCode,
      version: newVersion,
      name: rule.name,
      priority: rule.priority,
      conditions: rule.conditions,
      action: rule.action,
      changeSummary,
      publishedBy: userId
    });

    logger.info(`[RULES] Rule ${rule.ruleCode} updated to version ${newVersion}`);
    return rule;
  }

  static async toggleActivation(id, isActive) {
    return Rule.findByIdAndUpdate(id, { $set: { isActive } }, { new: true });
  }

  static async getRuleVersions(ruleCode) {
    return RuleVersion.find({ ruleCode })
      .sort({ version: -1 })
      .populate('publishedBy', 'fullName username email')
      .lean();
  }
}

module.exports = RuleConfigService;
