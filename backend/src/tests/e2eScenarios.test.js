const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Workflow = require('../models/Workflow');
const Rule = require('../models/Rule');
const Request = require('../models/Request');
const externalCreditService = require('../services/integrations/externalCreditService');

jest.setTimeout(90000);

let mongoServer;
let adminToken;
let reviewerToken;
let clientToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create Users
  await User.create({
    username: 'e2e_admin',
    email: 'admin@e2e.com',
    password: 'Password123!',
    fullName: 'E2E Admin',
    role: 'admin'
  });

  await User.create({
    username: 'e2e_reviewer',
    email: 'reviewer@e2e.com',
    password: 'Password123!',
    fullName: 'E2E Underwriter',
    role: 'reviewer'
  });

  await User.create({
    username: 'e2e_client',
    email: 'client@e2e.com',
    password: 'Password123!',
    fullName: 'E2E API Client',
    role: 'api_user'
  });

  // Login
  const adm = await request(app).post('/api/auth/login').send({ usernameOrEmail: 'e2e_admin', password: 'Password123!' });
  adminToken = adm.body.data.token;

  const rev = await request(app).post('/api/auth/login').send({ usernameOrEmail: 'e2e_reviewer', password: 'Password123!' });
  reviewerToken = rev.body.data.token;

  const cli = await request(app).post('/api/auth/login').send({ usernameOrEmail: 'e2e_client', password: 'Password123!' });
  clientToken = cli.body.data.token;

  // Create Baseline Workflow
  await Workflow.create({
    code: 'APPLICATION_APPROVAL',
    name: 'Loan Approval Pipeline',
    isActive: true,
    currentVersion: 1
  });

  // Create Rules
  await Rule.create({
    ruleCode: 'RULE_LOW_AMOUNT_APPROVE',
    workflowCode: 'APPLICATION_APPROVAL',
    name: 'Auto Approve Low Amount (<=$50k)',
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
    action: { outcome: 'AUTO_APPROVE', reason: 'Amount <= 50k and ID valid' }
  });

  await Rule.create({
    ruleCode: 'RULE_MID_AMOUNT_REVIEW',
    workflowCode: 'APPLICATION_APPROVAL',
    name: 'Underwriter Review Mid-Tier ($50k-$200k)',
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
    action: { outcome: 'MANUAL_REVIEW', reason: 'Mid-tier amount requires underwriter' }
  });

  await Rule.create({
    ruleCode: 'RULE_HIGH_AMOUNT_REJECT',
    workflowCode: 'APPLICATION_APPROVAL',
    name: 'Auto Reject Excessive Amount (> $200k)',
    priority: 3,
    version: 1,
    isActive: true,
    conditions: {
      operator: 'AND',
      rules: [{ field: 'amount', operator: 'gt', value: 200000 }]
    },
    action: { outcome: 'REJECT', reason: 'Exceeds platform lending cap' }
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Phase 10: Complete 10 End-to-End Business Scenarios', () => {
  // Scenario 1: Successful Automatic Approval
  it('Scenario 1: Successful Automatic Approval (low amount, ID present, bureau verified)', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'SUCCESS' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Alice Green', amount: 35000, income: 85000, documents: { idProof: 'DOC-123' } }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.currentStage).toBe('COMPLETED');
    expect(res.body.data.evaluationSummary.outcome).toBe('AUTO_APPROVE');
  });

  // Scenario 2: Automatic Rejection
  it('Scenario 2: Automatic Rejection (exceeds $200,000 threshold)', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Bob Vance', amount: 350000, income: 120000, documents: { idProof: 'DOC-456' } }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('REJECTED');
    expect(res.body.data.currentStage).toBe('COMPLETED');
    expect(res.body.data.evaluationSummary.outcome).toBe('REJECT');
  });

  // Scenario 3: Manual Review
  it('Scenario 3: Manual Review (mid-tier amount routes to queue and adjudicates)', async () => {
    const intakeRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Charlie Morgan', amount: 120000, income: 95000, documents: { idProof: 'DOC-789' } }
      });

    expect(intakeRes.body.data.status).toBe('MANUAL_REVIEW');
    const reqId = intakeRes.body.data.requestId;

    // Reviewer approves
    const reviewRes = await request(app)
      .post(`/api/reviews/${reqId}/approve`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ notes: 'Stated income verified against IRS transcripts' });

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.data.status).toBe('APPROVED');
    expect(reviewRes.body.data.reviewerNotes).toContain('IRS transcripts');
  });

  // Scenario 4: External Dependency Failure & Recovery
  it('Scenario 4: External Dependency Failure followed by successful retry', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'INTERMITTENT' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Diana Prince', amount: 45000, income: 100000, documents: { idProof: 'DOC-001' } }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');
  });

  // Scenario 5: Duplicate Submission (Idempotency)
  it('Scenario 5: Duplicate Submission with identical idempotencyKey returns cached response', async () => {
    const key = `E2E-IDEMP-KEY-${Date.now()}`;
    const payload = { applicantName: 'Eve Idempotent', amount: 25000, documents: { idProof: 'DOC-EVE' } };

    const first = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ workflowCode: 'APPLICATION_APPROVAL', idempotencyKey: key, payload });
    expect(first.statusCode).toBe(201);

    const second = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ workflowCode: 'APPLICATION_APPROVAL', idempotencyKey: key, payload });

    expect(second.statusCode).toBe(201);
    expect(second.body.data.requestId).toBe(first.body.data.requestId);
    expect(second.body._idempotency?.cached).toBe(true);
  });

  // Scenario 6: Configuration Change & Versioning
  it('Scenario 6: Rule threshold configuration change increments version and governs subsequent runs', async () => {
    const rule = await Rule.findOne({ ruleCode: 'RULE_LOW_AMOUNT_APPROVE' });
    expect(rule.version).toBe(1);

    // Update threshold to 75000 without code change
    const updateRes = await request(app)
      .put(`/api/rules/${rule._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Auto Approve Limit Bumped (<=$75k)',
        conditions: {
          operator: 'AND',
          rules: [
            { field: 'amount', operator: 'lte', value: 75000 },
            { field: 'documents.idProof', operator: 'exists', value: true }
          ]
        },
        changeSummary: 'Bumped low amount threshold from 50k to 75k'
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.version).toBe(2);

    // Request with $65,000 previously would go to MANUAL_REVIEW, now AUTO_APPROVES!
    externalCreditService.setChaosConfig({ forceMode: 'SUCCESS' });
    const postChangeRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Post Update Applicant', amount: 65000, documents: { idProof: 'DOC-NEW' } }
      });

    expect(postChangeRes.statusCode).toBe(201);
    expect(postChangeRes.body.data.status).toBe('APPROVED');
    expect(postChangeRes.body.data.evaluationSummary.outcome).toBe('AUTO_APPROVE');
  });

  // Scenario 7: Invalid Input Rejection
  it('Scenario 7: Invalid Input (missing applicantName or negative amount) rejected with 400', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: '', // empty name
          amount: -100 // negative amount
        }
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('VALIDATION_FAILED');
  });

  // Scenario 8: Retry Exhaustion
  it('Scenario 8: Retry Exhaustion (permanent downstream outage reaches terminal FAILED)', async () => {
    externalCreditService.setChaosConfig({ forceMode: 'FAIL' });
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'APPLICATION_APPROVAL',
        payload: { applicantName: 'Fail Applicant', amount: 20000, documents: { idProof: 'DOC-FAIL' } }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('FAILED');
    expect(res.body.data.currentStage).toBe('FAILED');
  });

  // Scenario 9: Unauthorized Access
  it('Scenario 9: Unauthorized Access denied with 401 (unauthenticated) and 403 (insufficient role)', async () => {
    // Missing token
    const unauth = await request(app).get('/api/workflows');
    expect(unauth.statusCode).toBe(401);

    // Non-admin attempting admin workflow creation
    const forbidden = await request(app)
      .post('/api/workflows')
      .set('Authorization', `Bearer ${clientToken}`) // api_user role
      .send({ code: 'NEW_UNAUTHORIZED_WF', name: 'Unauthorized' });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.body.errorCode).toBe('FORBIDDEN');
  });

  // Scenario 10: Workflow Configuration Failure
  it('Scenario 10: Workflow Configuration Failure fails safely without corrupting system', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        workflowCode: 'NON_EXISTENT_WORKFLOW_123',
        payload: { applicantName: 'Ghost', amount: 10000 }
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toContain('does not exist');
  });
});
