import cron from "node-cron"
import Workflow from "../models/workflowModel.js"
import Run from "../models/run.js"
import { workflowQueue } from "../queues/workflowQueue.js"

// Store active cron jobs so we can cancel/reschedule them
const activeJobs = new Map()
// Map looks like: { workflowId → cronJob }

// Called once on server startup
export async function initScheduler() {
  console.log("Initialising cron scheduler...")

  // Load all published schedule-type workflows from DB
  const workflows = await Workflow.find({
    status: "published",
    "trigger.type": "schedule",
  })

  console.log(`Found ${workflows.length} scheduled workflows`)

  for (const workflow of workflows) {
    scheduleWorkflow(workflow)
  }
}

// Schedule a single workflow — called on startup AND when user publishes one
export function scheduleWorkflow(workflow) {
  const expression = workflow.trigger.cronExpression

  // Validate the cron expression before registering
  if (!cron.validate(expression)) {
    console.error(`Invalid cron expression for workflow ${workflow._id}: "${expression}"`)
    return
  }

  // If already scheduled, stop it first (handles rescheduling)
  if (activeJobs.has(workflow._id.toString())) {
    activeJobs.get(workflow._id.toString()).stop()
  }

  // Register the cron job
  const job = cron.schedule(expression, async () => {
    console.log(`Cron firing for workflow ${workflow._id}`)
    try {
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

  // Save the job reference so we can stop it later
  activeJobs.set(workflow._id.toString(), job)
  console.log(`Scheduled workflow ${workflow._id} with "${expression}"`)
}

// Call this when a user deletes or unpublishes a workflow
export function unscheduleWorkflow(workflowId) {
  const job = activeJobs.get(workflowId.toString())
  if (job) {
    job.stop()
    activeJobs.delete(workflowId.toString())
    console.log(`Unscheduled workflow ${workflowId}`)
  }
}