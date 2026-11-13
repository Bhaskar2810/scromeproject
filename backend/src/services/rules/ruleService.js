const Rule = require('../../models/Rule');
const RuleVersion = require('../../models/RuleVersion');
const RuleEvaluator = require('./ruleEvaluator');
const AuditService = require('../audit/auditService');
const logger = require('../../utils/logger');

class RuleService {
  /**
   * Fetch active rules for a workflow or specific version snapshots
   */
  static async getRulesForWorkflow(workflowCode, pinnedVersions = null) {
    if (pinnedVersions && Array.isArray(pinnedVersions) && pinnedVersions.length > 0) {
      const versions = await RuleVersion.find({
        workflowCode,
        version: { $in: pinnedVersions.map((p) => p.version) }
      }).sort({ priority: 1 });
      return versions;
    }

    return Rule.find({
      workflowCode,
      isActive: true
    }).sort({ priority: 1 });
  }

  /**
   * Evaluate all business rules against request payload
   */
  static async evaluateRules(workflowCode, payload, requestId, pinnedVersions = null) {
    const rules = await this.getRulesForWorkflow(workflowCode, pinnedVersions);
    
    logger.info(`[RULES ENGINE] Evaluating ${rules.length} rules for request ${requestId} (workflow: ${workflowCode})`);

    const traces = [];
    let winningAction = null;
    let finalOutcome = 'APPROVED'; // default if no rules reject or flag
    let finalReason = 'All business criteria validated successfully';

    for (const rule of rules) {
      const trace = RuleEvaluator.evaluateRule(rule, payload);
      traces.push(trace);

      if (trace.matched) {
        logger.info(`[RULES ENGINE] Rule MATCHED: ${rule.ruleCode} -> Action: ${rule.action.outcome}`);
        // Priority-based evaluation: Highest priority (lowest number) decisive rule wins
        if (!winningAction || winningAction.outcome === 'NEXT_STAGE') {
          winningAction = rule.action;
          finalOutcome = rule.action.outcome;
          finalReason = rule.action.reason;
        }
      }
    }

    const rulesTriggered = traces.filter((t) => t.matched);
    const summary = {
      outcome: finalOutcome,
      reason: finalReason,
      ruleResults: traces,
      rulesEvaluatedCount: traces.length,
      rulesTriggeredCount: rulesTriggered.length,
      winningAction
    };

    await AuditService.recordEvent({
      requestId,
      eventType: 'RULES_EVALUATION_COMPLETED',
      stage: 'RULE_EVALUATION',
      details: {
        workflowCode,
        totalRules: traces.length,
        triggeredCount: rulesTriggered.length,
        outcome: finalOutcome,
        reason: finalReason,
        triggeredRuleCodes: rulesTriggered.map((r) => r.ruleCode),
        ruleVersions: rules.map((r) => ({ ruleCode: r.ruleCode, version: r.version }))
      }
    });

    return summary;
  }
}

module.exports = RuleService;
