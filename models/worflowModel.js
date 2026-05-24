import mongoose from "mongoose"

const workflowNodeRefSchema = new mongoose.Schema({
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "node",
    required: true,
  },
  order: { type: Number, required: true },
  nextOnTrueOrder:  { type: Number, default: null },
  nextOnFalseOrder: { type: Number, default: null },
  nextNodeIdOrder:  { type: Number, default: null },
}, { _id: false })

const workflowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name:   { type: String, required: true, trim: true },
    status: { type: String, enum: ["draft", "published","paused"], default: "draft" },
    trigger: {
      type:           { type: String, enum: ["webhook", "schedule"], required: true },
      secretKey:      String,
      cronExpression: String,
    },
    nodes: [workflowNodeRefSchema]
  },
  { timestamps: true }  
)

export default mongoose.model("workflow", workflowSchema)