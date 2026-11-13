const mongoose = require('mongoose');
const User = require('../models/User');
const Workflow = require('../models/Workflow');
const WorkflowVersion = require('../models/WorkflowVersion');
const Rule = require('../models/Rule');
const RuleVersion = require('../models/RuleVersion');
const Request = require('../models/Request');
const ExecutionHistory = require('../models/ExecutionHistory');
const AuditLog = require('../models/AuditLog');
const IdempotencyRecord = require('../models/IdempotencyRecord');
const DependencyLog = require('../models/DependencyLog');
const { connectDB, disconnectDB } = require('../config/db');
const logger = require('../utils/logger');

const seedDatabase = async () => {
  try {
    logger.info('================ SEEDING DATABASE ================');
    await connectDB();

    // Clear existing data cleanly
    await Promise.all([
      User.deleteMany({}),
      Workflow.deleteMany({}),
      WorkflowVersion.deleteMany({}),
      Rule.deleteMany({}),
      RuleVersion.deleteMany({}),
      Request.deleteMany({}),
      ExecutionHistory.deleteMany({}),
      AuditLog.deleteMany({}),
      IdempotencyRecord.deleteMany({}),
      DependencyLog.deleteMany({})
    ]);

    // 1. Create Users
    logger.info('Seeding users...');
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@resilient.io',
      password: 'AdminPassword123!',
      fullName: 'Chief Systems Architect',
      role: 'admin'
    });

    const reviewerUser = await User.create({
      username: 'reviewer',
      email: 'reviewer@resilient.io',
      password: 'ReviewerPassword123!',
      fullName: 'Senior Loan Underwriter',
      role: 'reviewer'
    });

    const apiUser = await User.create({
      username: 'api_client',
      email: 'client@resilient.io',
      password: 'ApiClientPassword123!',
      fullName: 'Automated Partner Service',
      role: 'api_user'
    });

    logger.info(`Created 3 users: admin, reviewer, api_client`);

    // 2. Create Primary Workflow: APPLICATION_APPROVAL
    logger.info('Seeding Application Approval Workflow...');
    const workflowStages = [
      { name: 'INITIALIZED', displayName: 'Request Initialized', description: 'Intake validated & ID assigned', order: 1 },
      { name: 'VALIDATION', displayName: 'Input Schema Validation', description: 'Validating payload fields and types', order: 2 },
      { name: 'RULE_EVALUATION', displayName: 'Business Rules Engine', description: 'Deterministic condition evaluation', order: 3 },
      { name: 'EXTERNAL_VERIFICATION', displayName: 'Credit Bureau Verification', description: 'Third-party bureau risk scoring', order: 4 },
      { name: 'MANUAL_REVIEW', displayName: 'Underwriter Review', description: 'Human-in-the-loop manual adjudication', order: 5 },
      { name: 'COMPLETED', displayName: 'Decision Finalized', description: 'Approved or Rejected terminal state', order: 6 }
    ];

    const workflowTransitions = [
      { from: 'INITIALIZED', to: 'VALIDATION', condition: 'START_PROCESS' },
      { from: 'VALIDATION', to: 'RULE_EVALUATION', condition: 'VALIDATION_SUCCESS' },
      { from: 'VALIDATION', to: 'FAILED', condition: 'VALIDATION_FAILED' },
      { from: 'RULE_EVALUATION', to: 'EXTERNAL_VERIFICATION', condition: 'RULE_AUTO_APPROVE' },
      { from: 'RULE_EVALUATION', to: 'REJECTED', condition: 'RULE_REJECT' },
      { from: 'RULE_EVALUATION', to: 'MANUAL_REVIEW', condition: 'RULE_MANUAL_REVIEW' },
      { from: 'EXTERNAL_VERIFICATION', to: 'APPROVED', condition: 'EXTERNAL_SUCCESS' },
      { from: 'EXTERNAL_VERIFICATION', to: 'RETRY_PENDING', condition: 'EXTERNAL_TRANSIENT_ERROR' },
      { from: 'RETRY_PENDING', to: 'EXTERNAL_VERIFICATION', condition: 'EXECUTE_RETRY' },
      { from: 'RETRY_PENDING', to: 'FAILED', condition: 'RETRIES_EXHAUSTED' },
      { from: 'MANUAL_REVIEW', to: 'APPROVED', condition: 'REVIEWER_APPROVE' },
      { from: 'MANUAL_REVIEW', to: 'REJECTED', condition: 'REVIEWER_REJECT' }
    ];

    const appWorkflow = await Workflow.create({
      code: 'APPLICATION_APPROVAL',
      name: 'Retail Loan & Credit Application Approval',
      description: 'Generic automated decision pipeline evaluating loan limit thresholds, documents, risk tiers, and external credit verification',
      category: 'FINANCE',
      isActive: true,
      currentVersion: 1,
      stages: workflowStages,
      transitions: workflowTransitions,
      createdBy: adminUser._id
    });

    await WorkflowVersion.create({
      workflowId: appWorkflow._id,
      workflowCode: appWorkflow.code,
      version: 1,
      name: appWorkflow.name,
      description: appWorkflow.description,
      stages: workflowStages,
      transitions: workflowTransitions,
      changeSummary: 'Initial production baseline version',
      publishedBy: adminUser._id
    });

    // Secondary Workflow: INSURANCE_CLAIM
    await Workflow.create({
      code: 'INSURANCE_CLAIM_PROCESSING',
      name: 'Automated Insurance Claim Adjudication',
      description: 'Processes claim amounts, incident police reports, and deductible limits',
      category: 'INSURANCE',
      isActive: true,
      currentVersion: 1,
      stages: workflowStages,
      transitions: workflowTransitions,
      createdBy: adminUser._id
    });

    // 3. Create Configurable Business Rules
    logger.info('Seeding Configurable Business Rules...');
    const rulesData = [
      {
        ruleCode: 'RULE_LOAN_AUTO_APPROVE_LOW_AMOUNT',
        workflowCode: 'APPLICATION_APPROVAL',
        name: 'Auto Approve Low Amount (<=$50,000)',
        description: 'Applications with amount <= 50,000 and valid identification are eligible for instant approval',
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
        action: {
          outcome: 'AUTO_APPROVE',
          reason: 'Application amount is <= 50,000 and mandatory ID document is present'
        },
        createdBy: adminUser._id
      },
      {
        ruleCode: 'RULE_LOAN_MANUAL_REVIEW_MID_AMOUNT',
        workflowCode: 'APPLICATION_APPROVAL',
        name: 'Manual Review Mid-Tier Amount ($50,001 - $200,000)',
        description: 'Applications between $50,001 and $200,000 require underwriter manual review',
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
        action: {
          outcome: 'MANUAL_REVIEW',
          reason: 'Application amount is between 50,001 and 200,000; requires underwriter assessment'
        },
        createdBy: adminUser._id
      },
      {
        ruleCode: 'RULE_LOAN_REJECT_EXCESSIVE_AMOUNT',
        workflowCode: 'APPLICATION_APPROVAL',
        name: 'Auto Reject Excessive Amount (> $200,000)',
        description: 'Applications exceeding $200,000 exceed automated limit and are rejected',
        priority: 3,
        version: 1,
        isActive: true,
        conditions: {
          operator: 'AND',
          rules: [
            { field: 'amount', operator: 'gt', value: 200000 }
          ]
        },
        action: {
          outcome: 'REJECT',
          reason: 'Requested amount exceeds platform policy limit of $200,000'
        },
        createdBy: adminUser._id
      },
      {
        ruleCode: 'RULE_LOAN_REJECT_MISSING_DOCUMENTS',
        workflowCode: 'APPLICATION_APPROVAL',
        name: 'Reject When Mandatory Documents Missing',
        description: 'Applications missing identity documents are rejected or routed to review',
        priority: 4,
        version: 1,
        isActive: true,
        conditions: {
          operator: 'OR',
          rules: [
            { field: 'documents.idProof', operator: 'exists', value: false }
          ]
        },
        action: {
          outcome: 'REJECT',
          reason: 'Mandatory identification proof document is missing'
        },
        createdBy: adminUser._id
      }
    ];

    for (const r of rulesData) {
      const created = await Rule.create(r);
      await RuleVersion.create({
        ruleId: created._id,
        ruleCode: created.ruleCode,
        workflowCode: created.workflowCode,
        version: 1,
        name: created.name,
        priority: created.priority,
        conditions: created.conditions,
        action: created.action,
        changeSummary: 'Initial rule creation',
        publishedBy: adminUser._id
      });
    }

    logger.info(`Seeded ${rulesData.length} rules.`);

    // 4. Seed Demonstrative Requests Representing All Scenarios
    logger.info('Seeding demonstration requests across lifecycle states...');

    // Scenario 1: Auto-Approved Request
    const reqApproved = await Request.create({
      requestId: 'REQ-DEMO-001-AUTO-APPROVED',
      idempotencyKey: 'IDEMP-DEMO-001',
      workflowCode: 'APPLICATION_APPROVAL',
      workflowVersion: 1,
      status: 'APPROVED',
      previousStatus: 'EXTERNAL_VERIFICATION',
      currentStage: 'COMPLETED',
      lastSuccessfulStage: 'APPROVED',
      payload: {
        applicantName: 'Alice Green',
        taxId: '123-45-6789',
        amount: 25000,
        income: 85000,
        documents: { idProof: 'DOC-PASSPORT-4412', taxReturn: 'DOC-W2-2025' }
      },
      evaluationSummary: {
        outcome: 'AUTO_APPROVE',
        reason: 'Application amount is <= 50,000 and mandatory ID document is present',
        rulesEvaluatedCount: 4,
        rulesTriggeredCount: 1,
        ruleResults: [
          {
            ruleCode: 'RULE_LOAN_AUTO_APPROVE_LOW_AMOUNT',
            ruleName: 'Auto Approve Low Amount (<=$50,000)',
            priority: 1,
            version: 1,
            evaluated: true,
            matched: true,
            explanation: 'Rule triggered: Application amount <= 50,000'
          }
        ]
      },
      submittedBy: apiUser._id
    });

    await AuditLog.create({
      requestId: reqApproved.requestId,
      eventType: 'REQUEST_CREATED',
      stage: 'INITIALIZED',
      actor: 'api_client',
      actorRole: 'api_user',
      details: { amount: 25000, applicant: 'Alice Green' }
    });
    await AuditLog.create({
      requestId: reqApproved.requestId,
      eventType: 'INPUT_VALIDATED',
      stage: 'VALIDATION',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { status: 'PASSED' }
    });
    await AuditLog.create({
      requestId: reqApproved.requestId,
      eventType: 'RULES_EVALUATION_COMPLETED',
      stage: 'RULE_EVALUATION',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { outcome: 'AUTO_APPROVE', triggeredRule: 'RULE_LOAN_AUTO_APPROVE_LOW_AMOUNT' }
    });
    await AuditLog.create({
      requestId: reqApproved.requestId,
      eventType: 'EXTERNAL_CALL_SUCCESS',
      stage: 'EXTERNAL_VERIFICATION',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { serviceName: 'CreditVerificationBureau', creditScore: 780, riskTier: 'LOW' }
    });
    await AuditLog.create({
      requestId: reqApproved.requestId,
      eventType: 'STAGE_TRANSITION',
      stage: 'COMPLETED',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { fromStatus: 'EXTERNAL_VERIFICATION', toStatus: 'APPROVED' }
    });

    // Scenario 2: Auto-Rejected Request (Amount > 200,000)
    const reqRejected = await Request.create({
      requestId: 'REQ-DEMO-002-AUTO-REJECTED',
      idempotencyKey: 'IDEMP-DEMO-002',
      workflowCode: 'APPLICATION_APPROVAL',
      workflowVersion: 1,
      status: 'REJECTED',
      previousStatus: 'RULE_EVALUATION',
      currentStage: 'COMPLETED',
      payload: {
        applicantName: 'Bob Vance',
        taxId: '987-65-4321',
        amount: 350000,
        income: 120000,
        documents: { idProof: 'DOC-DL-9912' }
      },
      evaluationSummary: {
        outcome: 'REJECT',
        reason: 'Requested amount exceeds platform policy limit of $200,000',
        rulesEvaluatedCount: 4,
        rulesTriggeredCount: 1,
        ruleResults: [
          {
            ruleCode: 'RULE_LOAN_REJECT_EXCESSIVE_AMOUNT',
            ruleName: 'Auto Reject Excessive Amount (> $200,000)',
            priority: 3,
            version: 1,
            evaluated: true,
            matched: true,
            explanation: 'Rule triggered: amount 350,000 > 200,000'
          }
        ]
      },
      submittedBy: apiUser._id
    });

    await AuditLog.create({
      requestId: reqRejected.requestId,
      eventType: 'REQUEST_CREATED',
      stage: 'INITIALIZED',
      actor: 'api_client',
      actorRole: 'api_user',
      details: { amount: 350000, applicant: 'Bob Vance' }
    });
    await AuditLog.create({
      requestId: reqRejected.requestId,
      eventType: 'STAGE_TRANSITION',
      stage: 'COMPLETED',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { fromStatus: 'RULE_EVALUATION', toStatus: 'REJECTED', reason: 'Excessive amount threshold' }
    });

    // Scenario 3: Manual Review Pending Request ($50,001 - $200,000)
    const reqManual = await Request.create({
      requestId: 'REQ-DEMO-003-MANUAL-REVIEW',
      idempotencyKey: 'IDEMP-DEMO-003',
      workflowCode: 'APPLICATION_APPROVAL',
      workflowVersion: 1,
      status: 'MANUAL_REVIEW',
      previousStatus: 'RULE_EVALUATION',
      currentStage: 'MANUAL_REVIEW',
      lastSuccessfulStage: 'RULE_EVALUATION',
      payload: {
        applicantName: 'Charlie Morgan',
        taxId: '456-78-1234',
        amount: 125000,
        income: 95000,
        documents: { idProof: 'DOC-PASSPORT-8811' }
      },
      evaluationSummary: {
        outcome: 'MANUAL_REVIEW',
        reason: 'Application amount is between 50,001 and 200,000; requires underwriter assessment',
        rulesEvaluatedCount: 4,
        rulesTriggeredCount: 1,
        ruleResults: [
          {
            ruleCode: 'RULE_LOAN_MANUAL_REVIEW_MID_AMOUNT',
            ruleName: 'Manual Review Mid-Tier Amount ($50,001 - $200,000)',
            priority: 2,
            version: 1,
            evaluated: true,
            matched: true,
            explanation: 'Rule triggered: amount 125,000 within mid-tier band'
          }
        ]
      },
      submittedBy: apiUser._id
    });

    await AuditLog.create({
      requestId: reqManual.requestId,
      eventType: 'REQUEST_CREATED',
      stage: 'INITIALIZED',
      actor: 'api_client',
      actorRole: 'api_user',
      details: { amount: 125000, applicant: 'Charlie Morgan' }
    });
    await AuditLog.create({
      requestId: reqManual.requestId,
      eventType: 'STAGE_TRANSITION',
      stage: 'MANUAL_REVIEW',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { fromStatus: 'RULE_EVALUATION', toStatus: 'MANUAL_REVIEW' }
    });

    // Scenario 4: External Retry Scenario (Failed attempt 1, succeeded attempt 2)
    const reqRetry = await Request.create({
      requestId: 'REQ-DEMO-004-RETRY-SUCCESS',
      idempotencyKey: 'IDEMP-DEMO-004',
      workflowCode: 'APPLICATION_APPROVAL',
      workflowVersion: 1,
      status: 'APPROVED',
      previousStatus: 'RETRY_PENDING',
      currentStage: 'COMPLETED',
      retryCount: 1,
      payload: {
        applicantName: 'Diana Prince',
        taxId: '333-22-1111',
        amount: 45000,
        income: 110000,
        documents: { idProof: 'DOC-STATE-ID-0091' }
      },
      submittedBy: apiUser._id
    });

    await DependencyLog.create({
      requestId: reqRetry.requestId,
      serviceName: 'CreditVerificationBureau',
      endpoint: '/api/v1/credit-check',
      attemptNumber: 1,
      isSuccess: false,
      statusCode: 503,
      durationMs: 82,
      errorMessage: 'Transient upstream connection drop'
    });

    await DependencyLog.create({
      requestId: reqRetry.requestId,
      serviceName: 'CreditVerificationBureau',
      endpoint: '/api/v1/credit-check',
      attemptNumber: 2,
      isSuccess: true,
      statusCode: 200,
      durationMs: 95,
      responsePayload: { verified: true, creditScore: 795, riskTier: 'LOW' }
    });

    await AuditLog.create({
      requestId: reqRetry.requestId,
      eventType: 'EXTERNAL_CALL_FAILED',
      stage: 'EXTERNAL_VERIFICATION',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { attemptNumber: 1, error: '503 Service Unavailable' }
    });

    await AuditLog.create({
      requestId: reqRetry.requestId,
      eventType: 'RETRY_SCHEDULED',
      stage: 'EXTERNAL_VERIFICATION',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { failedAttempt: 1, nextAttempt: 2, delayMs: 250 }
    });

    await AuditLog.create({
      requestId: reqRetry.requestId,
      eventType: 'EXTERNAL_CALL_SUCCESS',
      stage: 'EXTERNAL_VERIFICATION',
      actor: 'SYSTEM',
      actorRole: 'SYSTEM',
      details: { attemptNumber: 2, creditScore: 795 }
    });

    // Scenario 5: Duplicate Idempotency Record Seed
    await IdempotencyRecord.create({
      idempotencyKey: 'IDEMP-KEY-DUPLICATE-SAMPLE',
      requestId: 'REQ-DEMO-001-AUTO-APPROVED',
      requestHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      status: 'COMPLETED',
      statusCode: 201,
      responseBody: {
        success: true,
        message: 'Request submitted and processed',
        data: {
          requestId: 'REQ-DEMO-001-AUTO-APPROVED',
          status: 'APPROVED',
          currentStage: 'COMPLETED'
        }
      }
    });

    logger.info('================ SEEDING COMPLETE ================');
    logger.info('Demo Credentials:');
    logger.info('  Administrator : admin / AdminPassword123!');
    logger.info('  Underwriter   : reviewer / ReviewerPassword123!');
    logger.info('  API Client    : api_client / ApiClientPassword123!');
    logger.info('Workflows Seeded: APPLICATION_APPROVAL, INSURANCE_CLAIM_PROCESSING');
    logger.info('Rules Seeded    : 4 active rules with priority & version 1');
    logger.info('Sample Requests : REQ-DEMO-001, REQ-DEMO-002, REQ-DEMO-003, REQ-DEMO-004');
    
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.error('Error during database seeding:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
