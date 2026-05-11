const Workflow = require("../models/Workflow")
const Run = require("../models/Run")

// POST /workflows
exports.createWorkflow = async (req, res) => {
  try {
    const { name, trigger, nodes } = req.body

    const workflow = await Workflow.create({
      userId: req.userId,
      name,
      trigger,
      nodes: nodes || [],
      status: "draft",
    })

    res.status(201).json({ message: "Workflow created", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PATCH /workflows/:id
exports.editWorkflow = async (req, res) => {
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
exports.publishWorkflow = async (req, res) => {
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

    res.json({ message: "Workflow published", workflow })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /workflows/:id/run
exports.runWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    // Only published workflows can be run
    if (workflow.status !== "published")
      return res.status(400).json({ message: "Only published workflows can be run" })

    // Create a run record immediately as "pending"
    const run = await Run.create({
      workflowId: workflow._id,
      userId: req.userId,
      status: "pending",
      triggerType: "manual",
      triggerPayload: req.body.payload || {},
      startedAt: new Date(),
      nodeLogs: [],
    })

    // Respond immediately — execution happens async
    res.status(202).json({ message: "Workflow run started", runId: run._id })

    // Execute async (don't await — so user gets response immediately)
    executeWorkflow(workflow, run)

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /workflows/:id/runs
exports.getRunHistory = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    const runs = await Run.find({ workflowId: req.params.id })
      .sort({ startedAt: -1 })  // newest first
      .select("-nodeLogs")       // exclude nodeLogs for summary view

    res.json({ runs })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /workflows/:id
exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)

    if (!workflow)
      return res.status(404).json({ message: "Workflow not found" })

    if (workflow.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Forbidden" })

    // Delete workflow and all its runs
    await Workflow.findByIdAndDelete(req.params.id)
    await Run.deleteMany({ workflowId: req.params.id })

    res.json({ message: "Workflow and all runs deleted" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

