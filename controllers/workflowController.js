import Workflow from "../models/worflowModel.js"
import Run from "../models/run.js"
import Node from "../models/node.js"
import { nodeRegistry } from "../services/workflowExecutor.js"
import { workflowQueue } from "../queues/workflowQueue.js"
import { scheduleWorkflow, unscheduleWorkflow } from "../services/scheduler.js"
import cron from "node-cron"

// GET /workflows — list all workflows belonging to the authenticated user
export const listWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select("-nodes") // exclude node refs for the summary list view
    res.json({ workflows })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows — create a new draft workflow with inline node definitions
// Each node is created in the Node collection and referenced by ID in the workflow
export const createWorkflow = async (req, res) => {
  try {
    const { name, trigger, nodes } = req.body

    if (!trigger || !trigger.type)
      return res.status(400).json({ message: "trigger.type is required" })

    const nodeRefs = []

    for (const nodeDef of (nodes || [])) {
      const { name: nodeName, type, config, transformQuery,
        order, nextOnTrue, nextOnFalse, nextNodeId } = nodeDef

      if (order === undefined || order === null)
        return res.status(400).json({ message: `Node "${nodeName || type}" is missing required field: order` })

      // Reject unknown node types early — prevents executor errors at runtime
      if (!nodeRegistry[type])
        return res.status(400).json({
          message: `Unknown node type: "${type}"`,
          supported: Object.keys(nodeRegistry),
        })

      const createdNode = await Node.create({
        name: nodeName || "Untitled Node",
        type,
        config,
        transformQuery: transformQuery || null,
      })

      // Store branch routing as flat integers — Mongoose silently drops nested objects
      nodeRefs.push({
        nodeId:           createdNode._id,
        order,
        nextOnTrueOrder:  nextOnTrue  ? nextOnTrue.order  : null,
        nextOnFalseOrder: nextOnFalse ? nextOnFalse.order : null,
        nextNodeIdOrder:  nextNodeId  ? nextNodeId.order  : null,
      })
    }

    // Ensure nodes are sorted by order before saving
    nodeRefs.sort((a, b) => a.order - b.order)

    const workflow = await Workflow.create({
      userId: req.userId,
      name,
      trigger,
      nodes: nodeRefs,
      status: "draft",
    })

    res.status(201).json({ message: "Workflow created", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PATCH /workflows/:id — update a draft workflow (name, trigger, or nodes)
// Published workflows are frozen and cannot be edited
export const editWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    if (workflow.status === "published")
      return res.status(400).json({ message: "Cannot edit a published workflow. Create a new draft instead." })

    const { name, trigger, nodes } = req.body
    if (name)    workflow.name    = name
    if (trigger) workflow.trigger = trigger
    if (nodes)   workflow.nodes   = nodes

    await workflow.save()
    res.json({ message: "Workflow updated", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows/:id/publish — freeze a draft workflow for execution
// Once published, the workflow can be triggered but not edited
export const publishWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })
    if (workflow.status === "published")
      return res.status(400).json({ message: "Workflow already published" })
    if (!workflow.nodes || workflow.nodes.length === 0)
      return res.status(400).json({ message: "Cannot publish an empty workflow" })

    workflow.status = "published"
    await workflow.save()

    // Register cron job immediately if this is a scheduled workflow
    if (workflow.trigger.type === "schedule") {
      scheduleWorkflow(workflow)
    }

    res.json({ message: "Workflow published", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows/:id/run — manually trigger a published workflow
// Returns 202 immediately — execution is handled async by the BullMQ worker
export const runWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })
    if (workflow.status !== "published")
      return res.status(400).json({ message: "Only published workflows can be run" })

    // Create a run record immediately so the client has a runId to poll
    const run = await Run.create({
      workflowId:     workflow._id,
      userId:         req.userId,
      status:         "pending",
      triggerType:    "manual",
      triggerPayload: req.body.payload || {},
      startedAt:      new Date(),
      nodeLogs:       [],
    })

    // Offload execution to the BullMQ worker — Express is now free
    await workflowQueue.add("execute", {
      workflowId: workflow._id.toString(),
      runId:      run._id.toString(),
    })

    res.status(202).json({ message: "Workflow queued", runId: run._id })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /workflows/:id/runs — return execution history (summary, no node logs)
export const getRunHistory = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    const runs = await Run.find({ workflowId: req.params.id })
      .sort({ startedAt: -1 }) // newest first

    res.json({ runs })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /workflows/:id/runs/:runId — return full run detail including per-node logs
export const getRunDetail = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    const run = await Run.findById(req.params.runId)
    if (!run)
      return res.status(404).json({ message: "Run not found" })

    res.json({ run })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /workflows/:id — permanently delete a workflow and all its run history
export const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    await Workflow.findByIdAndDelete(req.params.id)
    await Run.deleteMany({ workflowId: req.params.id })

    // Cancel any active cron job for this workflow
    unscheduleWorkflow(req.params.id)

    res.json({ message: "Workflow and all runs deleted" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /workflows/nodes/:nodeId — fetch a single node's config
export const getNode = async (req, res) => {
  try {
    const node = await Node.findById(req.params.nodeId)
    if (!node) return res.status(404).json({ message: "Node not found" })
    res.json(node)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows/:id/pause — stop a published workflow from running
// Cancels any active scheduled cron job for the workflow
export const pauseWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
    if (!workflow) return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })
    if (workflow.status !== "published")
      return res.status(400).json({ message: "Only published workflows can be paused" })

    workflow.status = "paused"
    await workflow.save()
    unscheduleWorkflow(workflow._id)

    res.json({ message: "Workflow paused", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows/:id/resume — re-activate a paused workflow
// Re-registers the cron job if the workflow uses a schedule trigger
export const resumeWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
    if (!workflow) return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })
    if (workflow.status !== "paused")
      return res.status(400).json({ message: "Only paused workflows can be resumed" })

    workflow.status = "published"
    await workflow.save()

    if (workflow.trigger.type === "schedule") scheduleWorkflow(workflow)

    res.json({ message: "Workflow resumed", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PATCH /workflows/:id/reschedule — update the cron expression for a scheduled workflow
// Re-registers the cron job immediately with the new expression
export const rescheduleWorkflow = async (req, res) => {
  try {
    const { cronExpression } = req.body
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow) return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })
    if (workflow.trigger.type !== "schedule")
      return res.status(400).json({ message: "Only schedule workflows can be rescheduled" })
    if (!cron.validate(cronExpression))
      return res.status(400).json({ message: "Invalid cron expression" })

    workflow.trigger.cronExpression = cronExpression
    await workflow.save()

    if (workflow.status === "published") scheduleWorkflow(workflow)

    res.json({ message: "Workflow rescheduled", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
