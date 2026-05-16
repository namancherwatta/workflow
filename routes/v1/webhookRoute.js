import { Router } from "express"
import Workflow from "../../models/worflowModel.js"
import Run from "../../models/run.js"
import { workflowQueue } from "../../queues/workflowQueue.js"

const router = Router()

// POST /webhook/:workflowId/:secretKey
router.post("/:workflowId/:secretKey", async (req, res) => {
  try {
    const { workflowId, secretKey } = req.params

    // 1. Find the workflow
    const workflow = await Workflow.findById(workflowId)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    // 2. Validate secret key — this is how we verify the caller
    if (workflow.trigger.secretKey !== secretKey)
      return res.status(401).json({ message: "Invalid webhook secret" })

    // 3. Must be published to run
    if (workflow.status !== "published")
      return res.status(400).json({ message: "Workflow is not active" })

    // 4. Must actually be a webhook type workflow
    if (workflow.trigger.type !== "webhook")
      return res.status(400).json({ message: "Workflow is not a webhook type" })

    // 5. Create a run record with the incoming payload as trigger data
    const run = await Run.create({
      workflowId: workflow._id,
      userId:     workflow.userId,   // owner of the workflow
      status:     "pending",
      triggerType:"webhook",
      triggerPayload: req.body,      // whatever GitHub/Stripe/etc sent us
      startedAt:  new Date(),
      nodeLogs:   [],
    })

    // 6. Push to queue — respond immediately, worker handles execution
    await workflowQueue.add("execute", {
      workflowId: workflow._id.toString(),
      runId:      run._id.toString(),
    })

    // 7. Always return 200 fast — external services timeout if you're slow
    res.status(202).json({ message: "Workflow triggered", runId: run._id })

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router