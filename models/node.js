import mongoose from "mongoose"

const nodeSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "Untitled Node",
  },
  type: {
    type: String,
    required: true,
    // no enum — open to any type via registry
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  transformQuery: {
    type: String,
    default: null,
  },
}, { timestamps: true })

export default mongoose.model("node", nodeSchema)