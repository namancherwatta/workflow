# Flow — Workflow Builder

A distributed workflow orchestration system similar to Make or n8n. Users can design, publish, and monitor automated workflows that connect triggers and actions across different services.

Built as part of the Airtribe Backend Engineering Launchpad case study.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Node Types](#node-types)
- [Design Decisions](#design-decisions)
- [Project Structure](#project-structure)

---

## Overview

Flow lets users:

- **Design workflows** by connecting trigger events to sequential node actions via a drag-and-drop canvas
- **Automate tasks** through conditional logic, branching, delays, HTTP requests, and notifications
- **Monitor workflows** with detailed per-node execution logs, status tracking, and failure recovery

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Queue | BullMQ + Redis |
| Scheduler | node-cron |
| Auth | JWT + bcrypt |
| Notifications | Nodemailer (Email), Slack Webhooks |
| Frontend | React, Vite, Axios |

---

## System Architecture

```
Triggers (Webhook / Schedule / Manual)
        ↓
  Express API server
        ↓
  BullMQ Queue (Redis-backed)
        ↓
  BullMQ Worker (concurrency: 5)
        ↓
  Execution Engine
  → walks nodes in order
  → handles branching
  → retries on failure
  → saves logs per node
        ↓
  MongoDB (workflows, nodes, runs)
```

Three trigger types all funnel into the same BullMQ queue and execution engine — keeping the system consistent and scalable.

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/flow.git
cd flow

# Install dependencies
npm install

# Create .env file (see Environment Variables below)
cp .env.example .env

# Start Redis (Docker)
docker run -d -p 6379:6379 redis

# Start the server
node index.js
```

Server runs on `http://localhost:3000`

### Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/flow
JWT_SECRET=your_jwt_secret_key

REDIS_HOST=localhost
REDIS_PORT=6379

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your@gmail.com
```

For Gmail SMTP, use an App Password — go to myaccount.google.com/apppasswords to generate one.

---

## API Documentation

Base URL: `http://localhost:3000/api/v1`

All workflow routes require `Authorization: Bearer <token>` header.

---

### Auth

#### Register
```
POST /user/register
```
Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
Response `201`:
```json
{ "_id": "...", "name": "John Doe", "email": "john@example.com" }
```

#### Login
```
POST /user/login
```
Body:
```json
{ "email": "john@example.com", "password": "password123" }
```
Response `200`:
```json
{ "token": "eyJhbGci...", "message": "John Doe logged in" }
```

---

### Workflows

#### Create Workflow
```
POST /workflows
```
Body:
```json
{
  "name": "My Workflow",
  "trigger": {
    "type": "webhook",
    "secretKey": "mysecret123"
  },
  "nodes": [
    {
      "name": "Fetch data",
      "type": "http_request",
      "order": 1,
      "config": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    },
    {
      "name": "Check status",
      "type": "condition",
      "order": 2,
      "config": {
        "field": "data.status",
        "operator": "equals",
        "value": "active"
      },
      "nextOnTrue":  { "order": 3 },
      "nextOnFalse": { "order": 4 }
    },
    {
      "name": "Notify success",
      "type": "notify",
      "order": 3,
      "config": {
        "channel": "email",
        "to": "user@example.com",
        "message": "Status is active!"
      }
    },
    {
      "name": "Notify failure",
      "type": "notify",
      "order": 4,
      "config": {
        "channel": "email",
        "to": "user@example.com",
        "message": "Status is not active."
      }
    }
  ]
}
```
Response `201`: `{ "message": "Workflow created", "workflow": { ... } }`

For **schedule** trigger:
```json
"trigger": {
  "type": "schedule",
  "cronExpression": "*/5 * * * *"
}
```

#### List Workflows
```
GET /workflows
```
Response `200`: `{ "workflows": [...] }`

#### Edit Workflow (draft only)
```
PATCH /workflows/:id
```
Body: any subset of `{ name, trigger, nodes }`

#### Publish Workflow
```
POST /workflows/:id/publish
```
Freezes the workflow for execution. Cannot edit after publishing.

Response `200`: `{ "message": "Workflow published", "workflow": { ... } }`

#### Pause Workflow
```
POST /workflows/:id/pause
```
Stops a published workflow from running. Cancels scheduled cron if applicable.

#### Resume Workflow
```
POST /workflows/:id/resume
```
Re-activates a paused workflow.

#### Reschedule Workflow
```
PATCH /workflows/:id/reschedule
```
Body: `{ "cronExpression": "0 9 * * *" }`

Updates the cron schedule and re-registers the job immediately.

#### Manual Run
```
POST /workflows/:id/run
```
Body (optional): `{ "payload": { "key": "value" } }`

Response `202`: `{ "message": "Workflow queued", "runId": "..." }`

Execution is async — use the run history endpoint to check status.

#### Run History
```
GET /workflows/:id/runs
```
Response `200`: `{ "runs": [...] }` — sorted newest first, no node logs (summary view)

#### Run Detail
```
GET /workflows/:id/runs/:runId
```
Response `200`: `{ "run": { ..., "nodeLogs": [...] } }` — full node-level execution logs

#### Delete Workflow
```
DELETE /workflows/:id
```
Deletes workflow and all its runs. Cancels any active cron job.

#### Get Node
```
GET /workflows/nodes/:nodeId
```
Returns the full node config for a specific node.

---

### Webhook Trigger

```
POST /api/v1/webhook/:workflowId/:secretKey
```

Called by external services (GitHub, Stripe, etc.) to trigger a workflow. No auth header needed — the secret key in the URL is the authentication mechanism.

Body: any JSON payload — saved as `triggerPayload` and passed to first node as input.

Response `202`: `{ "message": "Workflow triggered", "runId": "..." }`

Example:
```
POST http://localhost:3000/api/v1/webhook/64abc.../mysecret123
{ "event": "user.signup", "userId": "u123" }
```

---

### Health Check

```
GET /health
```
Response `200`:
```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 3600,
  "timestamp": "2026-05-24T10:00:00Z"
}
```

---

## Node Types

### http_request
Makes an HTTP call to an external API.

Config:
```json
{
  "url": "https://api.example.com/endpoint",
  "method": "GET",
  "headers": {},
  "body": "{\"key\": \"value\"}"
}
```

Supports `{{output.field}}` interpolation in URL and body — pulls values from the previous node's output.

Output: `{ status, data, headers }`

---

### condition
Evaluates a field from the previous node's output and branches accordingly.

Config:
```json
{
  "field": "data.userId",
  "operator": "equals",
  "value": "1"
}
```

Supported operators: `equals`, `not_equals`, `gt`, `lt`, `contains`, `exists`

Output: `{ conditionResult: true/false, ...previousOutput }`

The workflow node reference must specify `nextOnTrue` and `nextOnFalse` to define which node to run on each branch.

---

### delay
Pauses execution for N seconds.

Config: `{ "seconds": 5 }`

Output: passes through the previous node's output unchanged.

---

### notify
Sends a notification via email or Slack.

Config (email):
```json
{
  "channel": "email",
  "to": "user@example.com",
  "message": "Hello from Flow!"
}
```

Config (Slack):
```json
{
  "channel": "slack",
  "slackWebhookUrl": "https://hooks.slack.com/services/...",
  "message": "Workflow completed"
}
```

Output: `{ notified: true, channel, message }`

---

### Adding a New Node Type

The system uses a Strategy Pattern for node execution. Adding a new node requires two steps only:

1. Create `services/nodes/your_node.js`:
```js
export default async function execute(config, input) {
  // your logic here
  return { result: "..." }
}
```

2. Register it in `services/workflowExecutor.js`:
```js
import your_node from "./nodes/your_node.js"
export const nodeRegistry = { ..., your_node }
```

No schema changes, no executor changes, nothing else.

---

## Design Decisions

### Why BullMQ + Redis for execution?

Workflows are executed asynchronously — the API responds immediately with `202 Accepted` and a `runId`, then a separate BullMQ worker picks up the job from Redis and runs it. This means:

- The Express server is never blocked by long-running workflows
- Multiple workflows run concurrently (concurrency: 5 per worker)
- Workers can be scaled independently of the API
- If a worker crashes mid-execution, the job is retried automatically by BullMQ
- Adding more workers = more throughput, zero code changes

### Why MongoDB with Mixed config?

Each node type has a completely different config shape. Using `mongoose.Schema.Types.Mixed` for the config field means no schema migrations are ever needed when adding new node types. The node registry handles validation at the application layer.

### Why Strategy Pattern for nodes?

Each node type is a standalone file with a single `execute(config, input)` function. The executor just looks up the handler from a registry object. This means:

- Adding a new node type requires exactly 1 new file and 1 line in the registry
- Zero risk of breaking existing nodes
- Easy to test each node type in isolation

### Why Draft → Published lifecycle?

Published workflows are frozen — you can run them but not edit them. This guarantees that a workflow's behaviour doesn't change while it has active runs or is being scheduled. To iterate on a published workflow, create a new draft.

### Workflow execution and branching

Nodes are connected via `nextOnTrueOrder`, `nextOnFalseOrder`, and `nextNodeIdOrder` — flat integer fields on each node reference. The executor walks these connections using a `getNextNodeRef` function that:

- For condition nodes — picks the true or false branch order
- For any node with `nextNodeIdOrder` — follows the explicit jump
- Tracks `arrivedViaBranch` to prevent branch bleed (running both branches)
- Falls back to sequential order for linear workflows

### Retry and timeout

Each node is wrapped in a retry loop with exponential backoff (1s, 2s, 4s) and a 10-second per-node timeout via `Promise.race`. Failed runs are marked in MongoDB with the error message and stack trace per node.

### Cron scheduling

`node-cron` registers one in-memory job per published scheduled workflow on startup. Jobs are also registered immediately when a workflow is published. Deleted or paused workflows cancel their job via an `activeJobs` Map. This avoids polling the database every minute.

---

## Project Structure

```
flow/
├── index.js                    # App entry, DB connect, scheduler init
├── controllers/
│   ├── userController.js       # Register, login
│   └── workflowController.js   # All workflow CRUD + run + logs
├── models/
│   ├── userModel.js
│   ├── worflowModel.js         # Workflow + WorkflowNodeRef schemas
│   ├── node.js                 # Node schema (open Mixed config)
│   └── run.js                  # Run + NodeLog schemas
├── routes/
│   └── v1/
│       ├── userRoute.js
│       ├── workflowRoute.js
│       └── webhookRoute.js
├── middleware/
│   └── auth.js                 # JWT verification
├── services/
│   ├── workflowExecutor.js     # Core execution engine + node registry
│   ├── scheduler.js            # node-cron scheduler
│   └── nodes/
│       ├── httpRequest.js
│       ├── condition.js
│       ├── delay.js
│       └── notify.js
├── queues/
│   └── workflowQueue.js        # BullMQ queue + worker
└── Frontend/
    ├── src/
    │   ├── api/index.js        # All axios API calls
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Auth.jsx        # Login + Register
    │   │   ├── Dashboard.jsx   # Workflow list, status, runs
    │   │   └── WorkflowBuilder.jsx  # Drag-and-drop canvas builder
    │   └── App.jsx
    └── package.json
```
