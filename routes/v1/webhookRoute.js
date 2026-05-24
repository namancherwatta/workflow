import { Router } from "express"
import Workflow from "../../models/worflowModel.js"
import Run from "../../models/run.js"
import { workflowQueue } from "../../queues/workflowQueue.js"

const router = Router()

// POST /api/v1/webhook/:workflowId/:secretKey
// Called by external services (GitHub, Stripe, etc.) to trigger a workflow
// No auth header required — the secret key in the URL is the authentication mechanism
router.post("/:workflowId/:secretKey", async (req, res) => {
  try {
    const { workflowId, secretKey } = req.params

    const workflow = await Workflow.findById(workflowId)
    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    // Validate secret key to prevent unauthorized triggers
    if (workflow.trigger.secretKey !== secretKey)
      return res.status(401).json({ message: "Invalid webhook secret" })

    if (workflow.status !== "published")
      return res.status(400).json({ message: "Workflow is not active" })

    if (workflow.trigger.type !== "webhook")
      return res.status(400).json({ message: "Workflow is not a webhook type" })

    // Create a run record — the incoming payload becomes the first node's input
    const run = await Run.create({
      workflowId:     workflow._id,
      userId:         workflow.userId,
      status:         "pending",
      triggerType:    "webhook",
      triggerPayload: req.body,
      startedAt:      new Date(),
      nodeLogs:       [],
    })

    // Offload to queue and respond immediately
    // External services (GitHub, Stripe) will retry if they don't get a fast response
    await workflowQueue.add("execute", {
      workflowId: workflow._id.toString(),
      runId:      run._id.toString(),
    })

    res.status(202).json({ message: "Workflow triggered", runId: run._id })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
