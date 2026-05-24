import cron from "node-cron"
import Workflow from "../models/worflowModel.js"
import Run from "../models/run.js"
import { workflowQueue } from "../queues/workflowQueue.js"

// In-memory store of active cron jobs keyed by workflow ID string
// Used to cancel or replace jobs when workflows are paused, deleted, or rescheduled
const activeJobs = new Map()

// Called once on server startup — loads all published scheduled workflows from DB
// and registers a cron job for each one
export async function initScheduler() {
  console.log("Initialising cron scheduler...")

  const workflows = await Workflow.find({
    status:         "published",
    "trigger.type": "schedule",
  })

  console.log(`Found ${workflows.length} scheduled workflows`)

  for (const workflow of workflows) {
    scheduleWorkflow(workflow)
  }
}

// Registers (or replaces) the cron job for a single workflow
// Safe to call multiple times — stops any existing job before creating a new one
export function scheduleWorkflow(workflow) {
  const expression = workflow.trigger.cronExpression

  if (!cron.validate(expression)) {
    console.error(`Invalid cron expression for workflow ${workflow._id}: "${expression}"`)
    return
  }

  // Stop the previous job if one already exists (handles rescheduling)
  if (activeJobs.has(workflow._id.toString())) {
    activeJobs.get(workflow._id.toString()).stop()
  }

  const job = cron.schedule(expression, async () => {
    console.log(`Cron firing for workflow ${workflow._id}`)
    try {
      // Create a run record and push it to the queue — same path as webhook/manual triggers
      const run = await Run.create({
        workflowId:     workflow._id,
        userId:         workflow.userId,
        status:         "pending",
        triggerType:    "schedule",
        triggerPayload: { firedAt: new Date() },
        startedAt:      new Date(),
        nodeLogs:       [],
      })

      await workflowQueue.add("execute", {
        workflowId: workflow._id.toString(),
        runId:      run._id.toString(),
      })
    } catch (err) {
      console.error(`Scheduler error for workflow ${workflow._id}:`, err.message)
    }
  })

  activeJobs.set(workflow._id.toString(), job)
  console.log(`Scheduled workflow ${workflow._id} with "${expression}"`)
}

// Stops and removes the cron job for a workflow
// Called when a workflow is deleted or paused
export function unscheduleWorkflow(workflowId) {
  const job = activeJobs.get(workflowId.toString())
  if (job) {
    job.stop()
    activeJobs.delete(workflowId.toString())
    console.log(`Unscheduled workflow ${workflowId}`)
  }
}
