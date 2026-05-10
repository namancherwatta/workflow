import mongoose from "mongoose"

// Log for each node execution within a run
const nodeLogSchema = new mongoose.Schema({
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Node",
    required: true,
  },
  order: Number,           // which step was this in the workflow
  status: {
    type: String,
    enum: ["success", "failed", "skipped"],
    required: true,
  },
  input: mongoose.Schema.Types.Mixed,   // what was passed INTO this node
  output: mongoose.Schema.Types.Mixed,  // what came OUT of this node
  error: {
    message: String,
    stack: String,
  },
  retryCount: {
    type: Number,
    default: 0,            // how many times it was retried
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number,        // in milliseconds
}, { _id: false })

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
    triggerPayload: mongoose.Schema.Types.Mixed, // raw data that triggered the run

    nodeLogs: [nodeLogSchema],  // ordered log of each node execution

    startedAt: Date,
    endedAt: Date,
    duration: Number,           // total run duration in ms
  },
  { timestamps: true }
)

module.exports = mongoose.model("run", runSchema)