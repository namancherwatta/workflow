import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import cors from "cors"
import userRoute from "./routes/v1/userRoute.js"
import workflowRoute from "./routes/v1/workflowRoute.js"
import webhookRoute from "./routes/v1/webhookRoute.js"
import { initScheduler } from "./services/scheduler.js"

dotenv.config()

const app = express()

// Allow requests from the frontend dev server
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use(express.json())

// Health check — returns DB connection status and server uptime
app.get("/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  res.json({
    status: "ok",
    db: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date(),
  })
})

// API routes — all versioned under /api/v1
app.use("/api/v1/user", userRoute)
app.use("/api/v1/workflows", workflowRoute)
app.use("/api/v1/webhook", webhookRoute)

// Connect to MongoDB first, then start the server and scheduler
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(3000, () => {
      console.log("Server running on port 3000")
    })
    // Start cron scheduler after DB is ready so it can query scheduled workflows
    initScheduler()
  })
  .catch(err => console.error("Startup error:", err))
