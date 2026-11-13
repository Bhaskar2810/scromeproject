# Resilient Decision System
### A Configurable Workflow Decision Platform built with the MERN Stack

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-6366f1.svg)](#technology-stack)
[![Node.js](https://img.shields.io/badge/Node.js-v24.16-339933.svg)](#backend)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](#frontend)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-47A248.svg)](#database)
[![Tests](https://img.shields.io/badge/Tests-20%20Passed-10B981.svg)](#testing)

---

## 1. Project Overview

The **Resilient Decision System** is an enterprise-grade platform designed to process high-throughput business intake requests, evaluate multi-conditional business rules deterministically without code changes, coordinate stateful lifecycle workflow stages, interface with external third-party dependencies with exponential backoff and jitter, generate explainable audit decisions, and gracefully absorb failures, retries, and duplicate submissions.

### Primary Demonstration Workflow
The primary workflow configured out-of-the-box is **Retail Loan & Credit Application Approval**, featuring:
- Low-amount instant auto-approvals ($\le \$50,000$).
- Mid-tier underwriter review band ($\$50,001 - \$200,000$).
- Excessive amount auto-rejections ($> \$200,000$).
- Mandatory document verification gates.
- External credit score bureau check with simulated chaos and fault recovery.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM v6, Axios, Recharts, Lucide React, Context API.
- **Backend**: Node.js, Express.js, REST API, JWT Authentication, bcryptjs, Zod Schema Validation, Helmet, Express Rate Limit, Morgan.
- **Database**: MongoDB with Mongoose ODM (includes embedded zero-config fallback for seamless developer onboarding).
- **Testing**: Jest, Supertest, React Testing Library.

---

## 3. Key Architecture & Features

1. **Deterministic Zero-Eval Rules Engine**:
   - Supports numeric thresholds, equality, presence, list containment (`gt`, `gte`, `lt`, `lte`, `eq`, `ne`, `in`, `exists`, `contains`).
   - Supports `AND` / `OR` condition groups and priority ordering.
   - Outputs full evaluation traces (evaluated, matched, actual vs expected values).

2. **Stateful Workflow Engine**:
   - Stages: `INITIALIZED` $\rightarrow$ `VALIDATION` $\rightarrow$ `RULE_EVALUATION` $\rightarrow$ `EXTERNAL_VERIFICATION` $\rightarrow$ `MANUAL_REVIEW` $\rightarrow$ `APPROVED` / `REJECTED` / `FAILED`.
   - Maintains full transition history and execution timestamps.
   - Pinning: Requests pin workflow and rule version snapshots at execution time so subsequent configuration changes do not affect in-flight runs.

3. **Append-Only Audit Trail**:
   - Application-level immutability enforced by Mongoose middleware.
   - Comprehensive event logging: Request creation, validation, rule evaluations, external calls, retries, and underwriter manual decisions.

4. **Resilience & Fault Tolerance**:
   - **Idempotency**: Prevents duplicate double-submissions using unique idempotency keys, SHA-256 request hashing, and atomic mutex locking.
   - **Retry Engine**: Exponential backoff with full jitter to prevent thundering herd spikes.
   - **External Bureau Simulator**: Configurable failure rate and live chaos modes (`SUCCESS`, `FAIL`, `TIMEOUT`, `INTERMITTENT`).

---

## 4. Quick Start & Installation

### Prerequisites
- Node.js $\ge$ 18 (Tested on Node v24)
- npm $\ge$ 9
- MongoDB (Optional: The application automatically connects to local MongoDB, or seamlessly boots an embedded in-memory MongoDB instance if local Mongo is not running).

### Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# (Optional) Review environment variables
# .env is pre-configured with safe development defaults

# Seed initial database (admin, reviewer, active workflow, rules, sample applications)
npm run seed

# Run the 20 automated tests
npm test

# Start backend server
npm start
# Server starts at http://localhost:5000 (API at http://localhost:5000/api)
```

### Setup Frontend

```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
# Dashboard opens at http://localhost:5173
```

---

## 5. Demo Credentials

The seed script creates the following pre-configured accounts:

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| **Administrator** | `admin` | `AdminPassword123!` | Workflow and Rule configuration, Chaos injection |
| **Reviewer / Underwriter** | `reviewer` | `ReviewerPassword123!` | Adjudicating the Manual Review Queue |
| **API Client** | `api_client` | `ApiClientPassword123!` | Automated programmatic intake submission |

*(Quick-login buttons are also provided directly on the login screen for 1-click access).*

---

## 6. Demonstration Scenarios

1. **Scenario 1: Automatic Approval**:
   - Application amount $\le \$50,000$ with valid ID document.
   - Passes validation $\rightarrow$ passes rules $\rightarrow$ external bureau verified $\rightarrow$ Status: `APPROVED`.

2. **Scenario 2: Automatic Rejection**:
   - Application amount $> \$200,000$ (e.g. $\$350,000$).
   - Rule `RULE_LOAN_REJECT_EXCESSIVE_AMOUNT` triggers $\rightarrow$ Status: `REJECTED`.

3. **Scenario 3: Manual Review**:
   - Application amount in mid-tier band ($\$120,000$).
   - Rule `RULE_LOAN_MANUAL_REVIEW_MID_AMOUNT` triggers $\rightarrow$ routed to `/reviews` $\rightarrow$ underwriter inspects trace and approves/rejects with audit comments.

4. **Scenario 4: External Dependency Failure & Retry**:
   - Bureau experiences simulated intermittent network drop on attempt 1.
   - Retry engine executes exponential backoff with jitter $\rightarrow$ succeeds on attempt 2 $\rightarrow$ Status: `APPROVED`.

5. **Scenario 5: Duplicate Submission with Idempotency Key**:
   - Submitting a request with an existing `idempotencyKey` returns the cached response with `_idempotency: { cached: true }` without re-running business logic.

6. **Scenario 6: Rule Configuration Change & Versioning**:
   - Admin updates a rule threshold or description via the UI/API.
   - Version increments to `v2` and creates a `RuleVersion` snapshot. Subsequent requests automatically evaluate against the new version.

---

## 7. Folder Structure

```
score_me/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment & MongoDB connection with memory fallback
│   │   ├── controllers/     # Auth, Request, Workflow, Rule, Review, Audit, System
│   │   ├── middleware/      # Auth, RBAC, Validation, Error Handling, Rate Limiter
│   │   ├── models/          # Mongoose Schemas & Append-Only Hooks
│   │   ├── routes/          # Express REST Endpoints
│   │   ├── services/
│   │   │   ├── audit/       # Append-only audit logger
│   │   │   ├── idempotency/ # Request hashing & mutex locks
│   │   │   ├── integrations/# External Credit Bureau simulator & chaos modes
│   │   │   ├── retry/       # Exponential backoff with jitter
│   │   │   ├── rules/       # Zero-eval deterministic condition evaluator
│   │   │   └── workflow/    # State machine & versioned lifecycle orchestrator
│   │   ├── validators/      # Zod request schemas
│   │   ├── utils/           # Logger and API response helpers
│   │   ├── scripts/         # Seed script with 4 scenarios and sample requests
│   │   ├── tests/           # 20 automated verification tests
│   │   ├── app.js           # Express app configuration
│   │   └── server.js        # Server entrypoint with graceful shutdown
│   ├── .env.example
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Visualizer, Timeline, Explanation, StatCards, Badges, Modals
│   │   ├── context/         # AuthContext & ToastContext
│   │   ├── pages/           # 12 Enterprise Dashboard & Workflow Pages
│   │   ├── services/        # Axios API client with token interception
│   │   ├── App.jsx          # Route tree
│   │   ├── index.css        # Tailwind directives & typography
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── architecture.md      # Architectural design & data flow
│   ├── api-documentation.md # REST API documentation
│   ├── configuration-guide.md # Dynamic workflow & rule configuration
│   ├── testing-strategy.md  # Test pyramid & 20 test descriptions
│   └── assumptions.md       # Implementation assumptions
└── README.md
```
