import mongoose from "mongoose"

// Embedded sub-document representing a node reference within a workflow
// Stores the node ID and routing info — actual node config lives in the Node collection
const workflowNodeRefSchema = new mongoose.Schema({
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "node",
    required: true,
  },
  order: { type: Number, required: true },

  // Branch routing — stored as flat integers to avoid Mongoose nested object issues
  // For condition nodes: nextOnTrueOrder and nextOnFalseOrder define which node to jump to
  // For linear nodes: nextNodeIdOrder defines an explicit jump (overrides sequential order)
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

    // draft = editable, published = frozen (ready to run), paused = temporarily stopped
    status: {
      type: String,
      enum: ["draft", "published", "paused"],
      default: "draft",
    },

    trigger: {
      type:           { type: String, enum: ["webhook", "schedule"], required: true },
      secretKey:      String, // used for webhook validation
      cronExpression: String, // used for schedule trigger (e.g. "*/5 * * * *")
    },

    nodes: [workflowNodeRefSchema],
  },
  { timestamps: true }
)

export default mongoose.model("workflow", workflowSchema)
