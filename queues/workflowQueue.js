import { Queue, Worker } from "bullmq"
import { executeWorkflow } from "../services/workflowExecutor.js"
import Workflow from "../models/worflowModel.js"
import Run from "../models/run.js"

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
}

// Queue — all three trigger types (webhook, manual, schedule) push jobs here
// Express responds immediately after adding to the queue — never waits for execution
export const workflowQueue = new Queue("workflow-runs", { connection })

// Worker — runs in the same process but independently of Express
// Pulls jobs from the queue and executes them with controlled concurrency
new Worker("workflow-runs", async (job) => {
  const { workflowId, runId } = job.data

  const workflow = await Workflow.findById(workflowId)
  const run      = await Run.findById(runId)

  if (!workflow || !run) throw new Error("Workflow or run not found")

  await executeWorkflow(workflow, run)
}, {
  connection,
  concurrency: 5, // max 5 workflows running in parallel — increase to scale
})
