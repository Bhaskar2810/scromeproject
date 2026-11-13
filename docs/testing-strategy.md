# Testing Strategy: Resilient Decision System

## 1. Testing Philosophy

The platform utilizes a comprehensive testing pyramid ensuring deterministic rule evaluation, state machine integrity, resilience under simulated downstream faults, and rigorous idempotency verification.

---

## 2. Test Suite Structure

The automated test suite (`backend/src/tests/decisionSystem.test.js`) executes 20 dedicated verification scenarios against an isolated in-memory MongoDB instance using Jest and Supertest.

| # | Test Scenario | Verified Capability |
|---|---------------|---------------------|
| 1 | Successful Request Creation | Validates HTTP 201 intake, unique ID generation, and immediate workflow transition |
| 2 | Invalid Input Validation | Verifies rejection of malformed payloads (negative amounts, missing names) |
| 3 | Mandatory Rule Failure | Checks rule rejection when mandatory ID documentation is missing |
| 4 | Threshold Rule Evaluation | Verifies amounts exceeding platform ceiling (> $200,000) trigger auto-rejection |
| 5 | Conditional Branching | Unit tests multi-criterion `AND` condition logic in `RuleEvaluator` |
| 6 | Successful Workflow Execution | Validates transition from INITIALIZED to COMPLETED/APPROVED |
| 7 | Rejected Workflow Execution | Asserts terminal REJECTED state and recorded explanation |
| 8 | Manual Review Workflow | Verifies intake routing to `MANUAL_REVIEW` and subsequent underwriter approval |
| 9 | Duplicate Request Submission | Confirms identical `idempotencyKey` returns cached response with `_idempotency.cached: true` |
| 10 | Idempotency Concurrency Lock | Asserts concurrent in-flight requests with same key return HTTP 409 Conflict |
| 11 | External Dependency Failure | Verifies permanent external bureau outages transition request to `FAILED` |
| 12 | Retry Mechanism Recovery | Validates that an intermittent network glitch recovers on attempt 2 |
| 13 | Retry Exhaustion | Verifies `RetryService` halts and raises an error when `maxRetries` is reached |
| 14 | Persistence Failure Handling | Asserts graceful error handling when executing non-existent request IDs |
| 15 | Rule Configuration Changes | Verifies rule updates increment version and record snapshot history |
| 16 | Workflow Versioning | Validates workflow updates increment version and record history |
| 17 | Audit Trail Correctness | Asserts chronological audit entries (`REQUEST_CREATED`, `INPUT_VALIDATED`, etc.) |
| 18 | Unauthorized Access | Verifies missing JWT returns HTTP 401 Unauthorized |
| 19 | Invalid Workflow Configuration | Verifies requests specifying non-existent workflows fail safely |
| 20 | Manual Review Authorization | Confirms non-reviewers (`api_user`) receive HTTP 403 Forbidden on review actions |

---

## 3. Running the Automated Test Suite

```bash
cd backend
npm test
```
