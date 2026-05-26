# Flow — Workflow Builder

A distributed workflow orchestration system similar to Make or n8n. Users can design, publish, and monitor automated workflows that connect triggers and actions across different services.

Built as part of the Airtribe Backend Engineering Launchpad case study.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Running with Docker (Recommended)](#running-with-docker-recommended)
- [Running Locally (Without Docker)](#running-locally-without-docker)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Node Types](#node-types)
- [Design Decisions](#design-decisions)

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
| Container | Docker, Docker Compose, nginx |

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

## Running with Docker (Recommended)

Docker Compose spins up all four services — MongoDB, Redis, the backend, and the frontend — with a single command. No need to install MongoDB or Redis locally.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Step 1 — Clone the repository

```bash
git clone https://github.com/namancherwatta/workflow.git
cd workflow
```

### Step 2 — Extract the Docker config files

```bash
unzip flow-docker.zip
```

This places `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, `docker-compose.yml`, `.env.example`, and `.dockerignore` into the project root.

### Step 3 — Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
JWT_SECRET=any_long_random_string_here
```

### Step 4 — Build and start everything

```bash
docker compose up --build
```

First run takes about 2–3 minutes to download images and build. Subsequent starts are instant.

### Step 5 — Open the app

| What | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/health |

---

### Useful Docker commands

```bash
# Start in the background (detached mode)
docker compose up --build -d

# View live logs from all services
docker compose logs -f

# View logs for one service only
docker compose logs -f backend

# Stop all services
docker compose down

# Stop and wipe all data (MongoDB + Redis volumes)
docker compose down -v

# Rebuild just the backend after a code change
docker compose up --build backend

# Rebuild just the frontend after a code change
docker compose up --build frontend
```

### How it works under the hood

```
Browser → http://localhost:5173
           ↓
        nginx (frontend container)
           ├── /          → serves React SPA (index.html)
           └── /api/*     → proxies to backend:3000
                               ↓
                         Express + BullMQ Worker
                               ├── MongoDB container
                               └── Redis container
```

nginx serves the built React app and proxies all `/api/` calls to the backend container — the browser never needs to know the backend's address directly.

---

## Running Locally (Without Docker)

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Backend

```bash
git clone https://github.com/your-username/flow.git
cd flow
npm install
cp .env.example .env
# Edit .env — add MONGO_URI, JWT_SECRET, REDIS_HOST, REDIS_PORT

# Start Redis via Docker (easiest even for local dev)
docker run -d -p 6379:6379 redis

node index.js
```

Server runs on `http://localhost:3000`

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Environment Variables

| Variable | Docker | Local | Description |
|---|---|---|---|
| `JWT_SECRET` | Required | Required | Secret for signing JWTs — use a long random string |
| `MONGO_URI` | Auto-set | Required | MongoDB connection string |
| `REDIS_HOST` | Auto-set | Required | Redis host (default: `localhost`) |
| `REDIS_PORT` | Auto-set | Required | Redis port (default: `6379`) |
| `SMTP_HOST` | Optional | Optional | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Optional | Optional | Usually `587` |
| `SMTP_USER` | Optional | Optional | Your email address |
| `SMTP_PASS` | Optional | Optional | Gmail App Password |
| `SMTP_FROM` | Optional | Optional | From address in sent emails |

> In Docker, `MONGO_URI`, `REDIS_HOST`, and `REDIS_PORT` are set automatically in `docker-compose.yml` using Docker service names. You do not need to set them in `.env` when using Docker.

For Gmail SMTP, generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

---

## Project Structure

```
flow/
├── Dockerfile.backend          # Backend Docker image
├── Dockerfile.frontend         # Frontend Docker image (Vite build + nginx)
├── nginx.conf                  # nginx: SPA routing + API proxy
├── docker-compose.yml          # Orchestrates all 4 services
├── .env.example                # Environment variable template
├── .dockerignore               # Files excluded from Docker build context
│
├── index.js                    # App entry — DB connect, scheduler init
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
│
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

#### Edit Workflow (draft only)
```
PATCH /workflows/:id
```

#### Publish Workflow
```
POST /workflows/:id/publish
```

#### Pause Workflow
```
POST /workflows/:id/pause
```

#### Resume Workflow
```
POST /workflows/:id/resume
```

#### Reschedule Workflow
```
PATCH /workflows/:id/reschedule
```
Body: `{ "cronExpression": "0 9 * * *" }`

#### Manual Run
```
POST /workflows/:id/run
```
Response `202`: `{ "message": "Workflow queued", "runId": "..." }`

#### Run History
```
GET /workflows/:id/runs
```

#### Run Detail
```
GET /workflows/:id/runs/:runId
```

#### Delete Workflow
```
DELETE /workflows/:id
```

---

### Webhook Trigger

```
POST /api/v1/webhook/:workflowId/:secretKey
```

No auth header needed — the secret key in the URL is the authentication. Body is any JSON and is passed to the first node as input.

Response `202`: `{ "message": "Workflow triggered", "runId": "..." }`

---

### Health Check

```
GET /health
```
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
Makes an HTTP call to an external API. Supports `{{output.field}}` interpolation in URL and body.

```json
{
  "url": "https://api.example.com/endpoint",
  "method": "GET",
  "headers": {},
  "body": "{\"key\": \"value\"}"
}
```
Output: `{ status, data, headers }`

---

### condition
Evaluates a field from the previous node's output and branches the workflow.

```json
{ "field": "data.userId", "operator": "equals", "value": "1" }
```
Operators: `equals`, `not_equals`, `gt`, `lt`, `contains`, `exists`

Output: `{ conditionResult: true/false, ...previousOutput }`

---

### delay
Pauses execution for N seconds.

```json
{ "seconds": 5 }
```

---

### notify
Sends a notification via email or Slack.

```json
{ "channel": "email", "to": "user@example.com", "message": "Hello!" }
```
```json
{ "channel": "slack", "slackWebhookUrl": "https://hooks.slack.com/...", "message": "Done" }
```

---

### Adding a New Node Type

1. Create `services/nodes/your_node.js`:
```js
export default async function execute(config, input) {
  return { result: "..." }
}
```

2. Register in `services/workflowExecutor.js`:
```js
import your_node from "./nodes/your_node.js"
export const nodeRegistry = { ..., your_node }
```

No schema changes, no executor changes, nothing else.

---

## Design Decisions

### Why BullMQ + Redis?
Workflows are async — Express responds immediately with `202` and a `runId`. The BullMQ worker picks up the job independently. This means Express is never blocked, workflows run concurrently (up to 5 per worker), and crashed workers retry automatically.

### Why MongoDB with Mixed config?
Each node type has a different config shape. `Schema.Types.Mixed` means no schema migrations when adding new node types. The node registry validates at the application layer.

### Why Strategy Pattern for nodes?
Each node is a standalone file with one `execute(config, input)` function. Adding a new type is one file and one registry line — zero risk of breaking existing nodes.

### Why Draft → Published lifecycle?
Published workflows are frozen so behaviour never changes under active runs or scheduled jobs. To iterate, create a new draft.

### Branching and bleed-through prevention
Nodes connect via `nextOnTrueOrder`, `nextOnFalseOrder`, and `nextNodeIdOrder` — flat integers. The executor tracks `arrivedViaBranch` so a completed branch stops instead of falling into unrelated nodes.

### Retry and timeout
Each node gets up to 3 retries with exponential backoff (1s → 2s → 4s) and a hard 10-second timeout via `Promise.race`. Failures are logged per node with message and stack trace.

### Cron scheduling
`node-cron` registers one in-memory job per scheduled workflow at startup and immediately on publish. An `activeJobs` Map cancels jobs when workflows are paused or deleted — no DB polling.
