# Configuration Guide: Resilient Decision System

This guide explains how administrators and business analysts can configure new business workflows and rules entirely through MongoDB and the Admin Dashboard, without writing or modifying source code.

---

## 1. Introducing a New Workflow (e.g. Employee Onboarding or Insurance Claim)

### Step 1: Define the Workflow Model via API or UI
Workflows are registered by providing a unique uppercase code, category, and an ordered list of lifecycle stages.

**Example: Insurance Claim Adjudication**
```json
POST /api/workflows
{
  "code": "INSURANCE_CLAIM_PROCESSING",
  "name": "Automated Auto Insurance Claim Adjudication",
  "description": "Evaluates damage repair estimates, police reports, and deductible limits",
  "category": "INSURANCE",
  "stages": [
    { "name": "INITIALIZED", "displayName": "Claim Filed", "order": 1 },
    { "name": "VALIDATION", "displayName": "Policy Verification", "order": 2 },
    { "name": "RULE_EVALUATION", "displayName": "Claim Damage Rules", "order": 3 },
    { "name": "MANUAL_REVIEW", "displayName": "Adjuster Review", "order": 4 },
    { "name": "COMPLETED", "displayName": "Claim Settled", "order": 5 }
  ]
}
```

---

## 2. Configuring Dynamic Business Rules

Each rule belongs to a `workflowCode` and specifies condition groups and outcomes.

### Condition Structure
- `operator`: `'AND'` (all criteria must be true) or `'OR'` (at least one criterion must be true).
- `rules`: Array of individual criteria:
  - `field`: JSON path in the payload (supports dot notation like `documents.policeReport` or `applicant.creditScore`).
  - `operator`:
    - `lte`: Less than or equal to numeric value.
    - `lt`: Less than numeric value.
    - `gte`: Greater than or equal to numeric value.
    - `gt`: Greater than numeric value.
    - `eq`: Exact string, numeric, or boolean equality.
    - `ne`: Not equal.
    - `in`: Array contains actual value.
    - `not_in`: Array does not contain actual value.
    - `exists`: Field presence check (`true` or `false`).
    - `contains`: Substring or array element containment.
  - `value`: Target comparison threshold.

### Rule Actions
- `AUTO_APPROVE`: Directly qualifies the request for approval.
- `MANUAL_REVIEW`: Routes request to the human review queue.
- `REJECT`: Immediately terminates the request in a `REJECTED` state.
- `NEXT_STAGE`: Continues sequential pipeline processing.

### Example Rules for Insurance Claim Processing:
```json
POST /api/rules
{
  "ruleCode": "RULE_CLAIM_FAST_TRACK",
  "workflowCode": "INSURANCE_CLAIM_PROCESSING",
  "name": "Fast-Track Minor Claims (<= $2,500)",
  "priority": 1,
  "conditions": {
    "operator": "AND",
    "rules": [
      { "field": "amount", "operator": "lte", "value": 2500 },
      { "field": "documents.policeReport", "operator": "exists", "value": true }
    ]
  },
  "action": {
    "outcome": "AUTO_APPROVE",
    "reason": "Minor claim amount <= $2,500 with verified police report qualifies for instant settlement"
  }
}
```

---

## 3. Rule Versioning & In-Flight Safety

When a rule is modified:
1. The rule's `version` is automatically incremented.
2. A snapshot document is written to `RuleVersion`.
3. Requests currently in progress maintain their pinned `workflowVersion` and rule definitions, preventing mid-flight policy drift.
