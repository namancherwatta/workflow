import mongoose from "mongoose"

// Per-node execution log — embedded inside a Run document
// Captures everything needed to debug a failed or slow node
const nodeLogSchema = new mongoose.Schema({
  nodeId:   { type: mongoose.Schema.Types.ObjectId, ref: "Node", required: true },
  nodeName: String,
  nodeType: String,
  order:    Number,

  status: {
    type: String,
    enum: ["success", "failed", "skipped"],
    required: true,
  },

  input:  mongoose.Schema.Types.Mixed, // data passed into this node
  output: mongoose.Schema.Types.Mixed, // data returned by this node

  error: {
    message: String,
    stack:   String,
  },

  retryCount: { type: Number, default: 0 }, // number of retry attempts before success or failure
  startedAt:  Date,
  endedAt:    Date,
  duration:   Number, // milliseconds

  // Only set for condition nodes — shows which branch was taken
  branchTaken: String, // "true branch" | "false branch"

}, { _id: false })

// Run represents a single execution of a workflow
// Created immediately when triggered — status updated as execution progresses
const runSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "running", "success", "failed"],
      default: "pending",
    },

    triggerType: {
      type: String,
      enum: ["webhook", "schedule", "manual"],
    },

    // Raw payload that triggered this run — passed as input to the first node
    triggerPayload: mongoose.Schema.Types.Mixed,

    // Ordered list of node execution logs — appended as each node completes
    nodeLogs: [nodeLogSchema],

    startedAt: Date,
    endedAt:   Date,
    duration:  Number, // total run duration in milliseconds
  },
  { timestamps: true }
)

export default mongoose.model("Run", runSchema)
