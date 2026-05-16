import { Queue, Worker } from "bullmq"
import { executeWorkflow } from "../services/workflowExecutor.js"
import Workflow from "../models/worflowModel.js"
import Run from "../models/run.js"

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
}

// Queue — your controllers push jobs here
export const workflowQueue = new Queue("workflow-runs", { connection })

// Worker — picks up jobs and runs them in a separate process
new Worker("workflow-runs", async (job) => {
  const { workflowId, runId } = job.data

  const workflow = await Workflow.findById(workflowId)
  const run      = await Run.findById(runId)

  if (!workflow || !run) throw new Error("Workflow or run not found")

  await executeWorkflow(workflow, run)

}, {
  connection,
  concurrency: 5,  // max 5 workflows running in parallel
})