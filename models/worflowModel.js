import mongoose from "mongoose"

const workflowNodeRefSchema = new mongoose.Schema({
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "node",
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  nextOnTrue: {
    nodeId: { type: mongoose.Schema.Types.ObjectId, ref: "Node" },
    order: Number,
  },
  nextOnFalse: {
    nodeId: { type: mongoose.Schema.Types.ObjectId, ref: "Node" },
    order: Number,
  },
}, { _id: false })

const workflowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    trigger: {
      type: {
        type: String,
        enum: ["webhook", "schedule"],
        required: true,
      },
      secretKey: String,       // if webhook
      cronExpression: String,  // if schedule e.g "*/5 * * * *"
    },

    nodes: [workflowNodeRefSchema]
    // Example:
    // [
    //   { nodeId: "n1", order: 1 },
    //   { nodeId: "n2", order: 2 },
    //   { nodeId: "n3", order: 3, nextOnTrue: {nodeId: "n4", order: 4}, nextOnFalse: {nodeId: "n5", order: 5} },
    // ]
  }
)

module.exports = mongoose.model("workflow", workflowSchema)