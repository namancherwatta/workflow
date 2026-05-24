import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (body) => api.post("/api/v1/user/register", body);
export const login = (body) => api.post("/api/v1/user/login", body);

// Workflows
export const createWorkflow = (body) => api.post("/api/v1/workflows", body);
export const editWorkflow = (id, body) => api.patch(`/api/v1/workflows/${id}`, body);
export const publishWorkflow = (id) => api.post(`/api/v1/workflows/${id}/publish`);
export const runWorkflow = (id, payload) => api.post(`/api/v1/workflows/${id}/run`, { payload });
export const deleteWorkflow = (id) => api.delete(`/api/v1/workflows/${id}`);
export const getRunHistory = (id) => api.get(`/api/v1/workflows/${id}/runs`);
export const getRunDetail = (workflowId, runId) =>
  api.get(`/api/v1/workflows/${workflowId}/runs/${runId}`);
export const getNode = (nodeId) => api.get(`/api/v1/workflows/nodes/${nodeId}`);
export const pauseWorkflow  = (id) => api.post(`/api/v1/workflows/${id}/pause`)
export const resumeWorkflow = (id) => api.post(`/api/v1/workflows/${id}/resume`)
export const rescheduleWorkflow = (id, cronExpression) => api.patch(`/api/v1/workflows/${id}/reschedule`, { cronExpression })
export const listWorkflows = () => api.get("/api/v1/workflows")
export default api;
