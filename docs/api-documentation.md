# API Documentation: Resilient Decision System

Base URL: `http://localhost:5000/api`

All protected endpoints require an `Authorization: Bearer <JWT>` header.

---

## 1. Authentication Endpoints

### Register User
- **Method**: `POST`
- **Path**: `/auth/register`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "underwriter_jane",
  "email": "jane@company.com",
  "password": "SecurePassword123!",
  "fullName": "Jane Underwriter",
  "role": "reviewer"
}
```
- **Response**: `201 Created`

### Login
- **Method**: `POST`
- **Path**: `/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "usernameOrEmail": "admin",
  "password": "AdminPassword123!"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "673...",
      "username": "admin",
      "email": "admin@resilient.io",
      "fullName": "Chief Systems Architect",
      "role": "admin"
    }
  }
}
```

### Current User Profile
- **Method**: `GET`
- **Path**: `/auth/me`
- **Access**: Authenticated

---

## 2. Request Intake & Execution Endpoints

### Submit Business Request (Intake)
- **Method**: `POST`
- **Path**: `/requests`
- **Access**: Authenticated
- **Request Body**:
```json
{
  "workflowCode": "APPLICATION_APPROVAL",
  "idempotencyKey": "IDEMP-20261113-001",
  "payload": {
    "applicantName": "Alice Green",
    "amount": 35000,
    "income": 85000,
    "taxId": "123-45-6789",
    "documents": {
      "idProof": "DOC-PASSPORT-4412"
    }
  }
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Request submitted and processed",
  "data": {
    "requestId": "REQ-20261113-7F2A",
    "status": "APPROVED",
    "currentStage": "COMPLETED",
    "workflowCode": "APPLICATION_APPROVAL",
    "workflowVersion": 1,
    "evaluationSummary": {
      "outcome": "AUTO_APPROVE",
      "reason": "Application amount is <= 50,000 and mandatory ID document is present",
      "rulesEvaluatedCount": 4,
      "rulesTriggeredCount": 1
    }
  }
}
```

### List Requests (Search & Filter)
- **Method**: `GET`
- **Path**: `/requests?status=APPROVED&page=1&limit=20`
- **Query Parameters**:
  - `status`: `APPROVED`, `REJECTED`, `MANUAL_REVIEW`, `FAILED`, `RETRY_PENDING`
  - `workflowCode`: e.g. `APPLICATION_APPROVAL`
  - `search`: Keyword matching `requestId` or `payload.applicantName`
  - `page`: Page index (default: 1)
  - `limit`: Page size (default: 20)

### Get Request Details
- **Method**: `GET`
- **Path**: `/requests/:id`
- **Returns**: Full request model, execution history, complete audit trail, and external dependency logs.

### Re-execute Request
- **Method**: `POST`
- **Path**: `/requests/:id/execute`

### Get Decision Explanation
- **Method**: `GET`
- **Path**: `/requests/:id/explanation`
- **Returns**: Explanatory breakdown of all evaluated rules, priority ordering, conditions evaluated with actual vs expected values, triggered status, and underwriter review notes.

### Get Execution History
- **Method**: `GET`
- **Path**: `/requests/:id/history`

---

## 3. Workflow Management Endpoints

### List Workflows
- **Method**: `GET`
- **Path**: `/workflows`

### Create Workflow
- **Method**: `POST`
- **Path**: `/workflows`
- **Access**: Admin only

### Get Workflow Versions
- **Method**: `GET`
- **Path**: `/workflows/:id/versions`

### Activate / Deactivate Workflow
- **Method**: `POST`
- **Path**: `/workflows/:id/activate`
- **Access**: Admin only
- **Body**: `{ "isActive": false }`

---

## 4. Rules Engine Management Endpoints

### List Rules
- **Method**: `GET`
- **Path**: `/rules?workflowCode=APPLICATION_APPROVAL`

### Create Rule
- **Method**: `POST`
- **Path**: `/rules`
- **Access**: Admin only
- **Body**:
```json
{
  "ruleCode": "RULE_LOAN_CREDIT_SCORE_MIN",
  "workflowCode": "APPLICATION_APPROVAL",
  "name": "Minimum Credit Score Requirement",
  "priority": 5,
  "conditions": {
    "operator": "AND",
    "rules": [
      { "field": "creditScore", "operator": "gte", "value": 650 }
    ]
  },
  "action": {
    "outcome": "NEXT_STAGE",
    "reason": "Credit score satisfies minimum benchmark"
  }
}
```

### Update Rule (Creates New Version Snapshot)
- **Method**: `PUT`
- **Path**: `/rules/:id`
- **Access**: Admin only

---

## 5. Manual Review Queue Endpoints

### List Review Queue
- **Method**: `GET`
- **Path**: `/reviews`
- **Access**: Admin, Reviewer

### Underwriter Approve
- **Method**: `POST`
- **Path**: `/reviews/:id/approve`
- **Access**: Admin, Reviewer
- **Body**: `{ "notes": "Verified applicant tax return; debt-to-income verified at 0.22" }`

### Underwriter Reject
- **Method**: `POST`
- **Path**: `/reviews/:id/reject`
- **Access**: Admin, Reviewer
- **Body**: `{ "notes": "Insufficient stated income for requested credit limit" }`

---

## 6. System & Resilience Endpoints

### Health Check
- **Method**: `GET`
- **Path**: `/health`

### External Dependency Status
- **Method**: `GET`
- **Path**: `/dependencies/status`

### Update Chaos Injection Settings
- **Method**: `POST`
- **Path**: `/dependencies/chaos`
- **Access**: Admin only
- **Body**:
```json
{
  "forceMode": "INTERMITTENT",
  "failureRate": 0.25,
  "timeoutMs": 3000
}
```
