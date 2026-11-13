# Resilient Decision System: Architecture & Design

## 1. Executive Summary

The **Resilient Decision System** is an enterprise-grade, configurable workflow decisioning platform architected with the MERN stack (MongoDB, Express, React, Node.js). It accepts structured business applications (e.g. retail loans, insurance claims, vendor onboarding), evaluates dynamic multi-condition business rules, orchestrates stateful workflow stages, interfaces with external verification dependencies under simulated real-world network turbulence, generates fully explainable decisions, and maintains an immutable append-only audit trail.

---

## 2. High-Level Architectural Diagram

```
                 +------------------------------------------+
                 |       React 18 + Tailwind Dashboard      |
                 | (Charts, Queue, Visualizer, Audit Trail) |
                 +--------------------+---------------------+
                                      |  REST / JWT Auth
                                      v
+---------------------------------------------------------------------------------+
|                       Node.js + Express Modular Backend                         |
|                                                                                 |
|  [Security & Middleware]                                                        |
|   - Helmet Headers, CORS Policy, Express Rate Limiter, RBAC Auth Middleware     |
|   - Zod Schema Request Validation & Error Sanitization                          |
|                                                                                 |
|  [Idempotency Layer] <--------------------+                                     |
|   - SHA-256 Request Payload Hashing       | Atomic TTL Lock & Response Cache    |
|   - In-Flight Concurrent Mutex Lock       | (Prevents Duplicate Double-Spends)  |
|                                                                                 |
|  [Workflow Execution Engine]              |                                     |
|   - Pipeline Stage Orchestrator           |                                     |
|   - Pinned Version Snapshotting           |                                     |
|   - State Transitions & Execution History |                                     |
|                                           |                                     |
|  [Deterministic Rules Engine]             |                                     |
|   - Zero-Eval Safe Condition Evaluator    |                                     |
|   - Multi-Operator (gt, lte, eq, exists)  |                                     |
|   - AND/OR Logic Groups & Priority Sort   |                                     |
|                                           |                                     |
|  [Resilience & Integration Engine]        |                                     |
|   - Exponential Backoff with Jitter       |                                     |
|   - Circuit / Fault Chaos Simulator       |                                     |
|                                           |                                     |
|  [Append-Only Audit Engine]               |                                     |
|   - Strict Application-Level Immutability |                                     |
+------------------------------------+--------------------------------------------+
                                     | Mongoose ODM (Indexes + Transactions)
                                     v
                 +------------------------------------------+
                 |             MongoDB Storage              |
                 |  (Workflows, Rules, Requests, Logs)      |
                 +------------------------------------------+
```

---

## 3. Core System Components

### 3.1 Idempotency Engine
To prevent duplicate processing caused by network retries, client timeouts, or double-clicks:
1. Intake endpoints accept an `idempotencyKey` in the request header or body.
2. A SHA-256 hash of the payload is computed.
3. If an idempotency record exists with `status: 'COMPLETED'`, the previously cached response is returned immediately with `_idempotency: { cached: true }`.
4. If the record is `status: 'PROCESSING'`, an HTTP `409 Conflict` is returned to prevent duplicate concurrent executions.
5. Once processing finishes successfully, the status is marked `COMPLETED` with an automatic 24-hour TTL expiration.

### 3.2 Deterministic Rules Engine
- **Safety Guarantee**: The engine never evaluates arbitrary strings with `eval()` or `new Function()`.
- **Condition Tree**: Rules are modeled as condition groups with an `operator` (`AND` or `OR`) and an array of criteria.
- **Supported Operators**: `gt`, `gte`, `lt`, `lte`, `eq`, `ne`, `in`, `not_in`, `exists`, `contains`.
- **Priority Resolution**: Rules are sorted by priority (`priority: 1` evaluates before `priority: 2`). The first triggering rule with decisive outcome (`REJECT` > `MANUAL_REVIEW` > `AUTO_APPROVE`) governs the decision.
- **Trace Generation**: Every rule evaluation records whether it was evaluated, whether conditions matched, the actual versus expected values, and its explanation.

### 3.3 Workflow Execution Engine & State Machine
The workflow engine transitions requests across distinct states:
1. `INITIALIZED`: Intake received, unique `requestId` generated.
2. `VALIDATION`: Payload schema and mandatory fields verified.
3. `RULE_EVALUATION`: Business rules evaluated.
4. `EXTERNAL_VERIFICATION`: Calls simulated external services (e.g. Credit Bureau).
5. `MANUAL_REVIEW`: Routed to human underwriters when criteria require adjudication.
6. `APPROVED` / `REJECTED`: Terminal decision states.
7. `RETRY_PENDING`: Transient dependency error undergoing exponential backoff.
8. `FAILED`: Terminal failure (validation error or retry exhaustion).

### 3.4 Append-Only Audit Trail
Audit logs are stored in a dedicated `AuditLog` collection.
- Mongoose middleware hooks (`pre('updateOne')`, `pre('findOneAndUpdate')`) explicitly throw errors to enforce append-only immutability at the application boundary.
- Every state transition, rule evaluation, external HTTP attempt, reviewer approval/rejection, and retry event is recorded chronologically with actor identity.

### 3.5 External Dependency Simulator & Fault Injection
The `ExternalCreditService` simulates real-world third-party bureau APIs:
- Probabilistic failures (configurable failure rate from 0% to 100%).
- Forced chaos modes: `SUCCESS`, `FAIL` (HTTP 503), `TIMEOUT` (HTTP 504), and `INTERMITTENT` (fails attempt 1, succeeds on attempt 2).
- Automatic logging of every invocation attempt, duration, request/response payload, and error code.

### 3.6 Exponential Backoff with Jitter
When an external dependency fails with a transient error, the `RetryService` schedules safe retries:
$$\text{Delay} = \min(\text{maxDelay}, \text{baseDelay} \times 2^{\text{attempt} - 1}) \times (0.5 + \text{random} \times 0.5)$$
The full jitter prevents thundering herd load spikes on recovery.

---

## 4. Scalability & Architectural Trade-offs

1. **Stateless Backend Nodes**: All session state is stored in JWT tokens and MongoDB. Application nodes can scale horizontally behind an NGINX or AWS ALB load balancer.
2. **MongoDB Indexing**: Compound indexes on `{ workflowCode: 1, status: 1 }`, `{ requestId: 1, timestamp: 1 }`, and unique sparse indexes on `{ idempotencyKey: 1 }` ensure $O(\log N)$ query performance even with millions of records.
3. **Configuration Version Pinning**: When an execution begins, the specific version of the workflow and rules is recorded in the `Request` document. Publishing a new rule version does not perturb in-flight executions.
4. **Decoupled Architecture**: While packaged as a high-cohesion modular monolith, every service (Rules, Workflow, Audit, External Integrations) has clear internal boundaries, allowing seamless future extraction into microservices if volume demands.
