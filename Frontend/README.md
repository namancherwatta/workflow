# FlowCraft Frontend

React + Axios frontend for the FlowCraft workflow automation backend.

## Setup

```bash
# Install dependencies
npm install

# Copy env file and set your backend URL
cp .env.example .env

# Start dev server (proxies /api → localhost:3000)
npm run dev
```

The Vite dev server runs on http://localhost:5173 and automatically proxies all `/api/*` requests to your backend on port 3000, so no CORS issues in development.

## Project Structure

```
src/
├── api/
│   └── index.js          # All axios calls (auth + workflows)
├── context/
│   └── AuthContext.jsx   # JWT auth state, login/logout
├── components/
│   └── ProtectedRoute.jsx
├── pages/
│   ├── Auth.jsx          # Login + Register pages
│   ├── Dashboard.jsx     # Workflow list, publish, run, run history
│   └── WorkflowBuilder.jsx # Visual drag-and-drop builder
├── App.jsx               # Routes
└── main.jsx
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/user/register | Register |
| POST | /api/v1/user/login | Login → JWT |
| POST | /api/v1/workflows | Create workflow |
| PATCH | /api/v1/workflows/:id | Edit draft workflow |
| POST | /api/v1/workflows/:id/publish | Publish workflow |
| POST | /api/v1/workflows/:id/run | Manual run |
| GET | /api/v1/workflows/:id/runs | Run history list |
| GET | /api/v1/workflows/:id/runs/:runId | Run detail + node logs |
| DELETE | /api/v1/workflows/:id | Delete workflow |

## Notes

- Workflows are stored locally in `localStorage` for the dashboard listing (the backend has no GET /workflows list endpoint)
- JWT token is stored in `localStorage` under key `"token"`
- The builder auto-saves to backend on SAVE; publishes separately
- Condition nodes have TRUE/FALSE output handles; all other nodes have a single DEFAULT handle
