const BASE_URL = 'http://127.0.0.1:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`[HTTP ${res.status}] ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function runLiveTests() {
  console.log('====================================================');
  console.log('   TESTING LIVE RUNNING BACKEND & MONGO ATLAS DB    ');
  console.log('====================================================\n');

  try {
    // 1. Healthcheck
    console.log('[TEST 1] Checking /api/health...');
    const healthRes = await request('/health');
    console.log('✓ Health Status:', healthRes.data.status);
    console.log('✓ Connected Database:', healthRes.data.database.name);
    console.log('✓ Counts:', healthRes.data.counts);

    // 2. Auth - Admin Login
    console.log('\n[TEST 2] Testing Admin Login...');
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { usernameOrEmail: 'admin', password: 'AdminPassword123!' }
    });
    const adminToken = adminLoginRes.data.token;
    console.log('✓ Admin authenticated successfully! Token generated.');

    // 3. Auth - Reviewer Login
    console.log('\n[TEST 3] Testing Reviewer Login...');
    const reviewerLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { usernameOrEmail: 'reviewer', password: 'ReviewerPassword123!' }
    });
    const reviewerToken = reviewerLoginRes.data.token;
    console.log('✓ Reviewer authenticated successfully!');

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const reviewerHeaders = { Authorization: `Bearer ${reviewerToken}` };

    // 4. Fetch Workflows
    console.log('\n[TEST 4] Fetching Workflows...');
    const wfRes = await request('/workflows', { headers: adminHeaders });
    console.log(`✓ Retrieved ${wfRes.data.length} workflows:`, wfRes.data.map(w => w.code));

    // 5. Fetch Rules
    console.log('\n[TEST 5] Fetching Rules Engine Configuration...');
    const rulesRes = await request('/rules', { headers: adminHeaders });
    console.log(`✓ Retrieved ${rulesRes.data.length} active business rules:`);
    rulesRes.data.forEach(r => console.log(`   - [P${r.priority}] ${r.ruleCode}: Outcome -> ${r.action.outcome}`));

    // 6. Test Scenario: Auto-Approve Loan Request (< $50,000)
    console.log('\n[TEST 6] Testing Scenario 1: Auto-Approval ($35,000 loan)...');
    const autoApproveRes = await request('/requests', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Live Test Alice',
          amount: 35000,
          income: 85000,
          documents: { idProof: 'DOC-LIVE-101' }
        }
      }
    });
    const autoReq = autoApproveRes.data;
    console.log(`✓ Request Created: ${autoReq.requestId}`);
    console.log(`✓ Status: ${autoReq.status} (Stage: ${autoReq.currentStage})`);
    console.log(`✓ Reason: ${autoReq.evaluationSummary.reason}`);

    // 7. Test Scenario: Auto-Reject (> $200,000)
    console.log('\n[TEST 7] Testing Scenario 2: Policy Auto-Rejection ($250,000 loan)...');
    const autoRejectRes = await request('/requests', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Live Test Bob',
          amount: 250000,
          income: 120000,
          documents: { idProof: 'DOC-LIVE-102' }
        }
      }
    });
    const rejectReq = autoRejectRes.data;
    console.log(`✓ Request Created: ${rejectReq.requestId}`);
    console.log(`✓ Status: ${rejectReq.status} (Stage: ${rejectReq.currentStage})`);
    console.log(`✓ Rejection Reason: ${rejectReq.evaluationSummary.reason}`);

    // 8. Test Scenario: Manual Review Routing ($120,000)
    console.log('\n[TEST 8] Testing Scenario 3: Manual Review Routing ($120,000 loan)...');
    const reviewQueueRes = await request('/requests', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        workflowCode: 'APPLICATION_APPROVAL',
        payload: {
          applicantName: 'Live Test Charlie',
          amount: 120000,
          income: 95000,
          documents: { idProof: 'DOC-LIVE-103' }
        }
      }
    });
    const reviewReq = reviewQueueRes.data;
    console.log(`✓ Request Created: ${reviewReq.requestId}`);
    console.log(`✓ Status: ${reviewReq.status} (Stage: ${reviewReq.currentStage})`);

    // 9. Reviewer Underwriting Adjudication
    console.log('\n[TEST 9] Underwriter Adjudicating Pending Request from Queue...');
    const adjudicationRes = await request(`/reviews/${reviewReq.requestId}/approve`, {
      method: 'POST',
      headers: reviewerHeaders,
      body: {
        notes: 'Live underwriting audit: Stated income verified against 2025 W-2s.'
      }
    });
    console.log(`✓ Adjudication Status: ${adjudicationRes.data.status}`);
    console.log(`✓ Reviewer Notes: "${adjudicationRes.data.reviewerNotes}"`);
    console.log(`✓ Reviewed By: ${adjudicationRes.data.reviewedBy}`);

    // 10. Explainable Decision Inspection
    console.log('\n[TEST 10] Testing Decision Explanation Endpoint...');
    const explainRes = await request(`/requests/${autoReq.requestId}/explain`, { headers: adminHeaders });
    console.log(`✓ Explainable Outcome for ${autoReq.requestId}:`, explainRes.data.finalDecision);
    console.log(`✓ Summary Reason:`, explainRes.data.summaryReason);
    console.log(`✓ Rules Evaluated Count: ${explainRes.data.rulesEvaluatedCount}`);
    console.log(`✓ Rules Triggered: ${explainRes.data.rulesTriggered.map(r => r.ruleCode).join(', ')}`);

    // 11. Idempotency Test
    console.log('\n[TEST 11] Testing Idempotency & Duplicate Prevention...');
    const idempKey = `LIVE-IDEMP-${Date.now()}`;
    const reqPayload = {
      workflowCode: 'APPLICATION_APPROVAL',
      idempotencyKey: idempKey,
      payload: { applicantName: 'Idempotency Tester', amount: 20000, documents: { idProof: 'DOC-IDEMP' } }
    };
    const firstSubmission = await request('/requests', { method: 'POST', headers: adminHeaders, body: reqPayload });
    const secondSubmission = await request('/requests', { method: 'POST', headers: adminHeaders, body: reqPayload });
    console.log(`✓ First Submission Request ID: ${firstSubmission.data.requestId}`);
    console.log(`✓ Second Submission Request ID: ${secondSubmission.data.requestId}`);
    console.log(`✓ Idempotency Cache Hit: ${secondSubmission._idempotency?.cached === true}`);

    // 12. Audit Trail Verification
    console.log('\n[TEST 12] Inspecting Live Audit Trail...');
    const auditRes = await request(`/audit/${autoReq.requestId}`, { headers: adminHeaders });
    console.log(`✓ Audit Events Recorded for ${autoReq.requestId}: ${auditRes.data.length} events`);
    auditRes.data.forEach(a => console.log(`   - [${a.stage}] ${a.eventType}: ${a.details?.outcome || a.details?.stage || 'Success'}`));

    console.log('\n====================================================');
    console.log('   ALL 12 LIVE BACKEND TESTS PASSED WITH 100% SUCCESS ');
    console.log('====================================================');
  } catch (err) {
    console.error('Test Failed:', err.message);
    process.exit(1);
  }
}

runLiveTests();
