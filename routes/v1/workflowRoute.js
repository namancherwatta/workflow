import { Router } from "express"
import auth from "../middleware/auth.js"
import {
  createWorkflow, editWorkflow, publishWorkflow,
  runWorkflow, getRunHistory, deleteWorkflow, createNode
} from "../../controllers/workflowController.js"

const router = Router()
router.post("/",           auth, createWorkflow)
router.patch("/:id",       auth, editWorkflow)
router.post("/:id/publish",auth, publishWorkflow)
router.post("/:id/run",    auth, runWorkflow)
router.get("/:id/runs",    auth, getRunHistory)
router.delete("/:id",      auth, deleteWorkflow)
router.get("/nodes/:nodeId", auth, getNode)

export default router