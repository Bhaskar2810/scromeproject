/**
 * Safe, deterministic, zero-eval condition evaluation engine
 */
class RuleEvaluator {
  /**
   * Safely resolve nested path like 'applicant.creditScore' or 'documents.idProof'
   */
  static getValueByPath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Helper to parse numeric values safely
   */
  static parseNumber(val) {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const num = Number(val);
      if (Number.isFinite(num)) return num;
    }
    return null;
  }

  /**
   * Evaluate a single condition criterion against payload
   */
  static evaluateCriterion(criterion, payload) {
    const { field, operator, value } = criterion;
    const actual = this.getValueByPath(payload, field);

    const actualNum = this.parseNumber(actual);
    const expectedNum = this.parseNumber(value);

    switch (operator) {
      case 'gt':
        return actualNum !== null && expectedNum !== null && actualNum > expectedNum;
      case 'gte':
        return actualNum !== null && expectedNum !== null && actualNum >= expectedNum;
      case 'lt':
        return actualNum !== null && expectedNum !== null && actualNum < expectedNum;
      case 'lte':
        return actualNum !== null && expectedNum !== null && actualNum <= expectedNum;
      case 'eq':
        if (actual === undefined || actual === null) return value === actual;
        return String(actual).toLowerCase() === String(value).toLowerCase();
      case 'ne':
        if (actual === undefined || actual === null) return value !== actual;
        return String(actual).toLowerCase() !== String(value).toLowerCase();
      case 'in':
        if (!Array.isArray(value)) return false;
        if (actual === undefined || actual === null) return false;
        return value.map((v) => String(v).toLowerCase()).includes(String(actual).toLowerCase());
      case 'not_in':
        if (!Array.isArray(value)) return true;
        if (actual === undefined || actual === null) return true;
        return !value.map((v) => String(v).toLowerCase()).includes(String(actual).toLowerCase());
      case 'exists':
        if (value === false) {
          return actual === undefined || actual === null || actual === '';
        }
        return actual !== undefined && actual !== null && actual !== '';
      case 'contains':
        if (typeof actual === 'string' && value !== undefined && value !== null) {
          return actual.toLowerCase().includes(String(value).toLowerCase());
        }
        if (Array.isArray(actual)) {
          return actual.map((v) => String(v).toLowerCase()).includes(String(value).toLowerCase());
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Evaluate a condition group (AND / OR)
   */
  static evaluateConditionGroup(conditionGroup, payload) {
    if (!conditionGroup || !Array.isArray(conditionGroup.rules) || conditionGroup.rules.length === 0) {
      return { matched: true, details: [] };
    }

    const operator = (conditionGroup.operator || 'AND').toUpperCase();
    const ruleEvaluations = conditionGroup.rules.map((criterion) => {
      const matched = this.evaluateCriterion(criterion, payload);
      const actualValue = this.getValueByPath(payload, criterion.field);
      return {
        field: criterion.field,
        operator: criterion.operator,
        expectedValue: criterion.value,
        actualValue,
        matched
      };
    });

    const overallMatched =
      operator === 'OR'
        ? ruleEvaluations.some((r) => r.matched)
        : ruleEvaluations.every((r) => r.matched);

    return {
      matched: overallMatched,
      operator,
      evaluations: ruleEvaluations
    };
  }

  /**
   * Evaluate an individual Rule model and generate audit trace
   */
  static evaluateRule(rule, payload) {
    const { matched, operator, evaluations } = this.evaluateConditionGroup(rule.conditions, payload);
    const trace = {
      ruleCode: rule.ruleCode,
      ruleName: rule.name,
      priority: rule.priority,
      version: rule.version,
      evaluated: true,
      matched,
      action: rule.action,
      explanation: matched
        ? `Rule triggered: ${rule.action?.reason || rule.name}`
        : `Rule skipped: Condition (${operator}) criteria not satisfied`,
      conditionDetails: evaluations,
      evaluatedAt: new Date()
    };

    return trace;
  }
}

module.exports = RuleEvaluator;
