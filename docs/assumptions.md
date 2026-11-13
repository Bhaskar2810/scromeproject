# Architectural & Implementation Assumptions

The following technical assumptions were made during the architecture and delivery of the Resilient Decision System:

1. **Database & In-Memory Fallback**:
   - Production installations connect to standard persistent MongoDB (`mongodb://localhost:27017/resilient_decision_system`).
   - For frictionless local development, automated test runner execution, and zero-configuration review environments where a standalone MongoDB service may not be running locally, the backend incorporates an embedded `mongodb-memory-server` fallback.

2. **Idempotency Strategy**:
   - Idempotency records are keyed by a client-provided `idempotencyKey` combined with a SHA-256 hash of the request payload.
   - Successful idempotency records persist in MongoDB with a 24-hour TTL index.

3. **Rule Precedence**:
   - Rules are evaluated sequentially by numeric priority (ascending order: priority 1 evaluates before priority 2).
   - In conflict resolution, `REJECT` and `MANUAL_REVIEW` actions take deterministic precedence over `AUTO_APPROVE`.

4. **External Service Dependency**:
   - External verification dependencies (such as credit bureaus or identity providers) are simulated with an internal simulator module (`ExternalCreditService`) capable of configurable network delay, probabilistic error rates, and dynamic chaos modes.

5. **Security & Authentication**:
   - Standard HS256 JWT tokens are signed using a secure secret key and set to expire after 7 days.
   - Passwords are salted and hashed using `bcryptjs` with a work factor of 10.
   - All role-based endpoints enforce RBAC (`admin`, `reviewer`, `api_user`).
