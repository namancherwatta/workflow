// routes/workflow.routes.js
const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const {
  createWorkflow,
  editWorkflow,
  publishWorkflow,
  runWorkflow,
  getRunHistory,
  deleteWorkflow,
} = require("../controllers/workflow.controller")

router.post("/", auth, createWorkflow)
router.patch("/:id", auth, editWorkflow)
router.post("/:id/publish", auth, publishWorkflow)
router.post("/:id/run", auth, runWorkflow)
router.get("/:id/runs", auth, getRunHistory)
router.delete("/:id", auth, deleteWorkflow)

module.exports = router