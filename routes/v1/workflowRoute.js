import { Router } from "express"
import auth from "../../middleware/auth.js"
import {
  createWorkflow, editWorkflow, publishWorkflow,
  runWorkflow, getRunHistory, deleteWorkflow, getNode, getRunDetail, pauseWorkflow, resumeWorkflow, rescheduleWorkflow, listWorkflows
} from "../../controllers/workflowController.js"

const router = Router()
router.get("/", auth, listWorkflows)
router.post("/",           auth, createWorkflow)
router.patch("/:id",       auth, editWorkflow)
router.post("/:id/publish",auth, publishWorkflow)
router.post("/:id/run",    auth, runWorkflow)
router.get("/:id/runs",    auth, getRunHistory)
router.get("/:id/runs/:runId",    auth, getRunDetail)
router.delete("/:id",      auth, deleteWorkflow)
router.get("/nodes/:nodeId", auth, getNode)
router.post("/:id/pause",  auth, pauseWorkflow)
router.post("/:id/resume", auth, resumeWorkflow)
router.patch("/:id/reschedule", auth, rescheduleWorkflow)
export default router