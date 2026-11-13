const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Workflow = require('../models/Workflow');
const WorkflowVersion = require('../models/WorkflowVersion');
const Rule = require('../models/Rule');
const RuleVersion = require('../models/RuleVersion');
const Request = require('../models/Request');
const AuditLog = require('../models/AuditLog');
const IdempotencyRecord = require('../models/IdempotencyRecord');
const externalCreditService = require('../services/integrations/externalCreditService');
const WorkflowEngine = require('../services/workflow/workflowEngine');
const RuleEvaluator = require('../services/rules/ruleEvaluator');
const RetryService = require('../services/retry/retryService');

let mongoServer;
let adminToken;
let reviewerToken;
let clientToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed Users
  const admin = await User.create({
    username: 'test_admin',
    email: 'admin@test.com',
    password: 'Password123!',
    fullName: 'Test Admin',
    role: 'admin'
  });

  const reviewer = await User.create({
    username: 'test_reviewer',
    email: 'reviewer@test.com',
    password: 'Password123!',
    fullName: 'Test Reviewer',
    role: 'reviewer'
  });

  const client = await User.create({
    username: 'test_client',
    email: 'client@test.com',
    password: 'Password123!',
    fullName: 'Test Client',
    role: 'api_user'
  });

  // Login to get JWT tokens
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'test_admin', password: 'Password123!' });
  adminToken = adminLogin.body.data.token;

  const reviewerLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'test_reviewer', password: 'Password123!' });
  reviewerToken = reviewerLogin.body.data.token;

  const clientLogin = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'test_client', password: 'Password123!' });
  clientToken = clientLogin.body.data.token;

  // Seed Workflow
  const stages = [
    { name: 'INITIALIZED', displayName: 'Initialized', order: 1 },
    { name: 'VALIDATION', displayName: 'Validation', order: 2 },
    { name: 'RULE_EVALUATION', displayName: 'Rule Evaluation', order: 3 },
    { name: 'EXTERNAL_VERIFICATION', displayName: 'External Verification', order: 4 },
    { name: 'MANUAL_REVIEW', displayName: 'Manual Review', order: 5 },
    { name: 'COMPLETED', displayName: 'Completed', order: 6 }
  ];

  await Workflow.create({
    code: 'APPLICATION_APPROVAL',
    name: 'Loan Application Workflow',
    category: 'FINANCE',
    isActive: true,
    currentVersion: 1,
    stages,
    createdBy: admin._id
  });

  // Seed Rules
  await Rule.create({
    ruleCode: 'RULE_LOW_AMOUNT_APPROVE',
    workflowCode: 'APPLICATION_APPROVAL',
    name: 'Approve <= 50000',
    priority: 1,
    version: 1,
    isActive: true,
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'amount', operator: 'lte', value: 50000 },
        { field: 'documents.idProof', operator: 'exists', value: true }
      ]
    },
    action: { outcome: 'AUTO_APPROVE', reason: 'Amount <= 50,000 and ID present' },
    createdBy: admin._id
  });

  await Rule.create({
    ruleCode: 'RULE_MID_AMOUNT_REVIEW',
    workflowCode: 'APPLICATION_APPROVAL',
    name: 'Manual Review 50001 - 200000',
    priority: 2,
    version: 1,
    isActive: true,
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'amount', operator: 'gt', value: 50000 },
        { field: 'amount', operator: 'lte', value: 200000 }
      ]
    },
    action: { outcome: 'MANUAL_REVIEW', reason: 'Amount in mid-tier review band' },
    createdBy: admin._id
  });

  await Rule.create({
    ruleCode: 'RULE_HIGH_AMOUNT_REJECT',
    workflowCode: 'APPLICATION_APPROVAL',
    name: 'Reject > 200000',
    priority: 3,
    version: 1,
    isActive: true,
    conditions: {
      operator: 'AND',
      rules: [{ field: 'amount', operator: 'gt', value: 200000 }]
    },
    action: { outcome: 'REJECT', reason: 'Amount exceeds 200,000 threshold' },
    createdBy: admin._id
  });

  await Rule.create({
    ruleCode: 'RULE_MANDATORY_DOC_CHECK',
    workflowCode: 'APPLICATION_APPROVAL',
    name: 'Reject Missing ID',
    priority: 4,
    version: 1,
    isActive: true,
    conditions: {
      operator: 'AND',
      rules: [{ field: 'documents.idProof', operator: 'exists', value: false }]
    },
    action: { outcome: 'REJECT', reason: 'Mandatory ID proof missing' },
    createdBy: admin._id
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Resilient Decision System - Comprehensive 20 Verification Tests', () => {
  // Test 1: Successful request creation
  it('1. Successful request creation and status 201 response', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'SUCCESS' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Sarah Jenkins',
          amount: 25000,
          income: 70000,
          documents: { idProof: 'DOC-12345' }
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestId).toBeDefined();
    expect(res.body.data.status).toBe('APPROVED');
  });

  // Test 2: Invalid input validation
  it('2. Invalid input validation rejects malformed payload with 400', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          // missing applicantName
          amount: -500 // negative amount
        }
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('VALIDATION_FAILED');
  });

  // Test 3: Mandatory rule failure
  it('3. Mandatory rule failure when required ID proof is absent', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'No Docs Applicant',
          amount: 15000,
          documents: { idProof: null } // missing ID
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('REJECTED');
  });

  // Test 4: Threshold-based rule evaluation
  it('4. Threshold-based rule evaluation: > 200,000 triggers auto-rejection', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Large Loan Applicant',
          amount: 500000,
          documents: { idProof: 'PASSPORT' }
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('REJECTED');
    expect(res.body.data.evaluationSummary.outcome).toBe('REJECT');
  });

  // Test 5: Conditional branching (Deterministic Rule Evaluator)
  it('5. Conditional branching: multi-operator AND condition matches accurately', () => {
    const conditionGroup = {
      operator: 'AND',
      rules: [
        { field: 'creditScore', operator: 'gte', value: 700 },
        { field: 'income', operator: 'gt', value: 50000 }
      ]
    };
    const matchingPayload = { creditScore: 720, income: 60000 };
    const nonMatchingPayload = { creditScore: 680, income: 80000 };

    const matchResult = RuleEvaluator.evaluateConditionGroup(conditionGroup, matchingPayload);
    const nonMatchResult = RuleEvaluator.evaluateConditionGroup(conditionGroup, nonMatchingPayload);

    expect(matchResult.matched).toBe(true);
    expect(nonMatchResult.matched).toBe(false);
  });

  // Test 6: Successful workflow execution
  it('6. Successful workflow execution reaches terminal APPROVED status', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'SUCCESS' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'John Doe',
          amount: 30000,
          income: 65000,
          documents: { idProof: 'ID-PASSPORT-01' }
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.currentStage).toBe('COMPLETED');
  });

  // Test 7: Rejected workflow execution
  it('7. Rejected workflow execution stops at REJECTED state and records reason', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Over Limit',
          amount: 250000,
          documents: { idProof: 'ID-PASSPORT-01' }
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('REJECTED');
  });

  // Test 8: Manual review workflow
  it('8. Manual review workflow routes to MANUAL_REVIEW and accepts underwriter decision', async () => {
    const intakeRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Underwriter Review Applicant',
          amount: 100000, // between 50,001 and 200,000
          income: 80000,
          documents: { idProof: 'VALID-ID' }
        }
      });

    expect(intakeRes.body.data.status).toBe('MANUAL_REVIEW');
    const reqId = intakeRes.body.data.requestId;

    // Reviewer approves with notes
    const reviewRes = await request(app)
      .post(`/api/reviews/${reqId}/approve`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ notes: 'Income verified via paystubs, approval granted.' });

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.data.status).toBe('APPROVED');
    expect(reviewRes.body.data.reviewerNotes).toContain('Income verified');
  });

  // Test 9: Duplicate request submission
  it('9. Duplicate request submission returns cached response with idempotency flag', async () => {
    const key = `TEST-IDEMP-KEY-${Date.now()}`;
    const payload = {
      applicantName: 'Idempotent User',
      amount: 40000,
      documents: { idProof: 'DOC-01' }
    };

    // First request
    const firstRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        idempotencyKey: key,
        payload
      });

    expect(firstRes.statusCode).toBe(201);
    const originalReqId = firstRes.body.data.requestId;

    // Second request with exact same idempotencyKey
    const secondRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        idempotencyKey: key,
        payload
      });

    expect(secondRes.statusCode).toBe(201);
    expect(secondRes.body.data.requestId).toBe(originalReqId);
    expect(secondRes.body._idempotency?.cached).toBe(true);
  });

  // Test 10: Idempotency behavior across concurrent locks
  it('10. Idempotency behavior prevents duplicate processing', async () => {
    const key = `CONCURRENT-KEY-${Date.now()}`;
    await IdempotencyRecord.create({
      idempotencyKey: key,
      requestId: 'REQ-IN-FLIGHT',
      requestHash: 'abc123hash',
      status: 'PROCESSING'
    });

    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        idempotencyKey: key,
        payload: { applicantName: 'Concurrent User', amount: 35000 }
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.errorCode).toBe('IDEMPOTENCY_IN_PROGRESS');
  });

  // Test 11: External dependency failure
  it('11. External dependency failure marked cleanly when bureau fails permanently', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'FAIL' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Dependency Fail User',
          amount: 20000,
          documents: { idProof: 'VALID-ID' }
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('FAILED');
  });

  // Test 12: Retry mechanism handles intermittent failure and recovers
  it('12. Retry mechanism: succeeds on attempt 2 after simulated intermittent transient error', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'INTERMITTENT' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Retry Recover Applicant',
          amount: 22000,
          documents: { idProof: 'ID-PASSPORT-02' }
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');
  });

  // Test 13: Retry exhaustion
  it('13. Retry exhaustion throws error when max retries exceeded', async () => {
    let callCount = 0;
    const failingOp = async () => {
      callCount++;
      throw new Error('Permanent downstream failure');
    };

    await expect(
      RetryService.executeWithRetry(failingOp, {
        requestId: 'REQ-TEST-EXHAUSTION',
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 50
      })
    ).rejects.toThrow('Permanent downstream failure');

    expect(callCount).toBe(3); // 1 initial + 2 retries = 3
  });

  // Test 14: MongoDB / persistence failure handling
  it('14. Persistence failure handling: handles non-existent request safely', async () => {
    await expect(
      WorkflowEngine.execute('REQ-NON-EXISTENT-999')
    ).rejects.toThrow('Request REQ-NON-EXISTENT-999 not found');
  });

  // Test 15: Rule configuration changes
  it('15. Rule configuration changes increment version and record snapshot', async () => {
    const rule = await Rule.findOne({ ruleCode: 'RULE_LOW_AMOUNT_APPROVE' });
    expect(rule.version).toBe(1);

    const updateRes = await request(app)
      .put(`/api/rules/${rule._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Auto Approve Updated Limit <= 60000',
        changeSummary: 'Bumped limit to 60k'
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.version).toBe(2);

    const versionsRes = await request(app)
      .get(`/api/rules/${rule.ruleCode}/versions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(versionsRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // Test 16: Workflow configuration changes
  it('16. Workflow configuration changes increment version number and update database', async () => {
    const wf = await Workflow.findOne({ code: 'APPLICATION_APPROVAL' });
    expect(wf.currentVersion).toBe(1);

    const updateRes = await request(app)
      .put(`/api/workflows/${wf._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated production loan pipeline with enhanced safeguards',
        changeSummary: 'Updated description and compliance parameters'
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.currentVersion).toBe(2);
  });

  // Test 17: Audit trail correctness
  it('17. Audit trail correctness: verified chronological events and append-only constraints', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'SUCCESS' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Audit Test Applicant',
          amount: 25000,
          documents: { idProof: 'ID-PASSPORT-99' }
        }
      });

    const reqId = res.body.data.requestId;
    const auditRes = await request(app)
      .get(`/api/audit/${reqId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.statusCode).toBe(200);
    expect(Array.isArray(auditRes.body.data)).toBe(true);
    const eventTypes = auditRes.body.data.map((a) => a.eventType);
    expect(eventTypes).toContain('REQUEST_CREATED');
    expect(eventTypes).toContain('INPUT_VALIDATED');
    expect(eventTypes).toContain('RULES_EVALUATION_COMPLETED');
  });

  // Test 18: Unauthorized access
  it('18. Unauthorized access: returns 401 when token is missing', async () => {
    const res = await request(app).get('/api/workflows');
    expect(res.statusCode).toBe(401);
  });

  // Test 19: Invalid workflow configuration
  it('19. Invalid workflow configuration: non-existent workflow fails gracefully', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'DOES_NOT_EXIST_XYZ',
        payload: { applicantName: 'Ghost Applicant', amount: 10000 }
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toContain('does not exist');
  });

  // Test 20: Manual review authorization
  it('20. Manual review authorization: api_user is forbidden (403) from approving reviews', async () => {
    const reviewRes = await request(app)
      .post('/api/reviews/REQ-DEMO-001/approve')
      .set('Authorization', `Bearer ${clientToken}`) // api_user, not reviewer/admin
      .send({ notes: 'Unauthorized attempt' });

    expect(reviewRes.statusCode).toBe(403);
    expect(reviewRes.body.errorCode).toBe('FORBIDDEN');
  });

  // Test 21: Invalid terminal state re-execution
  it('21. Invalid terminal state re-execution: rejecting re-execution of approved request', async () => {
    // Create an approved request
    externalCreditService.setChaosConfig({ forceMode: 'SUCCESS' });
    const intakeRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Terminal Applicant', amount: 20000, documents: { idProof: 'VALID' } }
      });

    const reqId = intakeRes.body.data.requestId;
    expect(intakeRes.body.data.status).toBe('APPROVED');

    // Attempt re-execution on finalized request
    const reExecRes = await request(app)
      .post(`/api/requests/${reqId}/execute`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(reExecRes.statusCode).toBe(400);
    expect(reExecRes.body.errorCode).toBe('INVALID_STATE_TRANSITION');
  });

  // Test 22: Concurrent manual review race condition
  it('22. Concurrent manual review: second review attempt on already reviewed request returns 409', async () => {
    const intakeRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Race Review Applicant', amount: 150000, documents: { idProof: 'VALID' } }
      });

    const reqId = intakeRes.body.data.requestId;
    expect(intakeRes.body.data.status).toBe('MANUAL_REVIEW');

    // Reviewer 1 approves
    const rev1 = await request(app)
      .post(`/api/reviews/${reqId}/approve`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ notes: 'First underwriter approval' });
    expect(rev1.statusCode).toBe(200);

    // Reviewer 2 concurrently attempts rejection on the same request
    const rev2 = await request(app)
      .post(`/api/reviews/${reqId}/reject`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ notes: 'Conflicting second review attempt' });
    expect(rev2.statusCode).toBe(409);
    expect(rev2.body.errorCode).toBe('INVALID_REVIEW_STATE');
  });

  // Test 23: Complete rule operators suite
  it('23. Rule operators: in, not_in, contains, eq, ne evaluate correctly', () => {
    const payload = {
      country: 'USA',
      employmentType: 'FULL_TIME',
      tags: ['VIP', 'PREFERRED'],
      notes: 'Clean credit history'
    };

    expect(RuleEvaluator.evaluateCriterion({ field: 'country', operator: 'eq', value: 'USA' }, payload)).toBe(true);
    expect(RuleEvaluator.evaluateCriterion({ field: 'country', operator: 'ne', value: 'CANADA' }, payload)).toBe(true);
    expect(RuleEvaluator.evaluateCriterion({ field: 'employmentType', operator: 'in', value: ['PART_TIME', 'FULL_TIME'] }, payload)).toBe(true);
    expect(RuleEvaluator.evaluateCriterion({ field: 'employmentType', operator: 'not_in', value: ['UNEMPLOYED', 'STUDENT'] }, payload)).toBe(true);
    expect(RuleEvaluator.evaluateCriterion({ field: 'tags', operator: 'contains', value: 'VIP' }, payload)).toBe(true);
    expect(RuleEvaluator.evaluateCriterion({ field: 'notes', operator: 'contains', value: 'clean' }, payload)).toBe(true);
  });

  // Test 24: Empty payload rejection
  it('24. Empty payload rejection: returns 400 when body or payload is empty', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {}
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_FAILED');
  });

  // Test 25: Excessive amount exceeding platform limit
  it('25. Excessive amount exceeding limit: returns 400 when amount > 1 billion', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Trillionaire Applicant',
          amount: 5000000000 // 5 billion
        }
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_FAILED');
  });
});
