import Workflow from "../models/worflowModel.js"
import Run from "../models/run.js"
import Node from "../models/node.js"
import { nodeRegistry } from "../services/workflowExecutor.js"
import { workflowQueue } from "../queues/workflowQueue.js"
import { scheduleWorkflow, unscheduleWorkflow } from "../services/scheduler.js"

// POST /workflows
export const createWorkflow = async (req, res) => {
  try {
     //console.log("BODY:", JSON.stringify(req.body, null, 2))
    const { name, trigger, nodes } = req.body

    // Validate trigger
    if (!trigger || !trigger.type)
      return res.status(400).json({ message: "trigger.type is required" })

    // 1. Create each node from the inline definition
    //    nodes array comes in with full config, not just IDs
    const nodeRefs = []

    for (const nodeDef of (nodes || [])) {
      const { name: nodeName, type, config, transformQuery, order,
        nextOnTrue, nextOnFalse, nextNodeId } = nodeDef
       
      // Validate node type against registry
      if (!nodeRegistry[type])
        return res.status(400).json({
          message: `Unknown node type: "${type}"`,
          supported: Object.keys(nodeRegistry)
        })

      // Insert the actual node into the Node collection
      const createdNode = await Node.create({
        name: nodeName || "Untitled Node",
        type,
        config,
        transformQuery: transformQuery || null,
      })

      // Build the workflow node reference
      nodeRefs.push({
        nodeId:           createdNode._id,
        order,
        nextOnTrueOrder:  nextOnTrue  ? nextOnTrue.order  : null,
        nextOnFalseOrder: nextOnFalse ? nextOnFalse.order : null,
        nextNodeIdOrder:  nextNodeId  ? nextNodeId.order  : null,
})
    }

    // 2. Sort refs by order just to be safe
    nodeRefs.sort((a, b) => a.order - b.order)

    // 3. Create the workflow with the generated nodeIds
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

// PATCH /workflows/:id
export const editWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    // Only the owner can edit
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    // Cannot edit a published workflow
    if (workflow.status === "published")
      return res.status(400).json({ message: "Cannot edit a published workflow. Create a new draft instead." })

    const { name, trigger, nodes } = req.body

    if (name) workflow.name = name
    if (trigger) workflow.trigger = trigger
    if (nodes) workflow.nodes = nodes

    await workflow.save()

    res.json({ message: "Workflow updated", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows/:id/publish
export const publishWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    if (workflow.status === "published")
      return res.status(400).json({ message: "Workflow already published" })

    // Must have at least one node to publish
    if (!workflow.nodes || workflow.nodes.length === 0)
      return res.status(400).json({ message: "Cannot publish empty workflow" })

    workflow.status = "published"
    await workflow.save()
    if (workflow.trigger.type === "schedule") {
       scheduleWorkflow(workflow)   // ← register cron immediately
    }

    res.json({ message: "Workflow published", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows/:id/run
export const runWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })
    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })
    if (workflow.status !== "published")
      return res.status(400).json({ message: "Only published workflows can be run" })

    // Create the run record
    const run = await Run.create({
      workflowId: workflow._id,
      userId:     req.userId,
      status:     "pending",
      triggerType:"manual",
      triggerPayload: req.body.payload || {},
      startedAt:  new Date(),
      nodeLogs:   [],
    })

    // ✅ Push to queue — Express is done, worker picks it up separately
    await workflowQueue.add("execute", {
      workflowId: workflow._id.toString(),
      runId:      run._id.toString(),
    })

    // Respond immediately — execution is now offloaded
    res.status(202).json({ message: "Workflow queued", runId: run._id })

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /workflows/:id/runs
export const getRunHistory = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    const runs = await Run.find({ workflowId: req.params.id })
      .sort({ startedAt: -1 })  // newest first
           // exclude nodeLogs for summary view

    res.json({ runs })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /workflows/:id
export const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    // Delete workflow and all its runs
    await Workflow.findByIdAndDelete(req.params.id)
    await Run.deleteMany({ workflowId: req.params.id })
    unscheduleWorkflow(req.params.id)  
    res.json({ message: "Workflow and all runs deleted" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

//Get Node
export const getNode = async (req, res) => {
  try {
    const node = await Node.findById(req.params.nodeId)
    if (!node) return res.status(404).json({ message: "Node not found" })
    res.json(node)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

//run Detail
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


//Pause workflow
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
    unscheduleWorkflow(workflow._id)  // stop cron if scheduled
    res.json({ message: "Workflow paused", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

//Resume workflow
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

//reschedule workflow
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

    // Re-register cron job with new expression
    if (workflow.status === "published") scheduleWorkflow(workflow)

    res.json({ message: "Workflow rescheduled", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// workflowController.js
export const listWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select("-nodes")  // exclude heavy nodes array for list view
    res.json({ workflows })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}