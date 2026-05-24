import { Router } from "express"
import auth from "../../middleware/auth.js"
import {
  listWorkflows, createWorkflow, editWorkflow, publishWorkflow,
  runWorkflow, getRunHistory, getRunDetail, deleteWorkflow,
  getNode, pauseWorkflow, resumeWorkflow, rescheduleWorkflow,
} from "../../controllers/workflowController.js"

const router = Router()

// Workflow CRUD
router.get("/",                      auth, listWorkflows)
router.post("/",                     auth, createWorkflow)
router.patch("/:id",                 auth, editWorkflow)
router.delete("/:id",                auth, deleteWorkflow)

// Lifecycle
router.post("/:id/publish",          auth, publishWorkflow)
router.post("/:id/pause",            auth, pauseWorkflow)
router.post("/:id/resume",           auth, resumeWorkflow)
router.patch("/:id/reschedule",      auth, rescheduleWorkflow)

// Execution
router.post("/:id/run",              auth, runWorkflow)
router.get("/:id/runs",              auth, getRunHistory)
router.get("/:id/runs/:runId",       auth, getRunDetail)

// Node lookup
router.get("/nodes/:nodeId",         auth, getNode)

export default router
