import mongoose from "mongoose"

// const nodeSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       default: "Untitled Node",
//     },
//     type: {
//       type: String,
//       enum: ["http_request", "condition", "delay", "notify"],
//       required: true,
//     },
//     config: {
//       // HTTP Request
//       url: String,
//       method: { type: String, enum: ["GET", "POST", "PUT", "DELETE"] },
//       headers: { type: Map, of: String },
//       body: String,

//       // Condition
//       field: String,       // e.g. "response.status"
//       operator: String,    // "equals", "gt", "lt", "contains"
//       value: String,

//       // Delay
//       seconds: Number,

//       // Notify
//       channel: { type: String, enum: ["email", "slack"] },
//       to: String,
//       message: String,
//     },

//     // JS expression to transform previous node's output
//     transformQuery: {
//       type: String,
//       default: null,    
//     },
//   }
// )

// models/node.js

const nodeSchema = new mongoose.Schema({
  name: { type: String, default: "Untitled Node" },

  type: {
    type: String,
    required: true,
  },

  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  transformQuery: { type: String, default: null },
}, { timestamps: true })


export default mongoose.model("node", nodeSchema)