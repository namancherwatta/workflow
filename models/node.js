import mongoose from "mongoose"

// Node represents a single step in a workflow
// Config is intentionally open (Mixed type) so new node types can be added
// without any schema changes — validation happens at the API layer via the node registry
const nodeSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "Untitled Node",
  },
  type: {
    type: String,
    required: true,
    // No enum here — node types are validated against the nodeRegistry at runtime
    // This allows adding new node types without a DB migration
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Optional JS expression to transform the previous node's output before passing it in
  // Example: "output.data.userId" — evaluated in a sandboxed vm context
  transformQuery: {
    type: String,
    default: null,
  },
}, { timestamps: true })

export default mongoose.model("node", nodeSchema)
