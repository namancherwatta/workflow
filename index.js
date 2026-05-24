import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import userRoute from "./routes/v1/userRoute.js"
import workflowRoute from "./routes/v1/workflowRoute.js"
import webhookRoute from "./routes/v1/webhookRoute.js"
import { initScheduler } from "./services/scheduler.js"
import cors from "cors"  

dotenv.config()
const app=express()

app.use(cors({                        
  origin: "http://localhost:5173",    
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))
app.use(express.json())

app.get("/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  res.json({
    status: "ok",
    db: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date(),
  })
})

app.use("/api/v1/user",userRoute)
app.use("/api/v1/workflows", workflowRoute)
app.use("/api/v1/webhook", webhookRoute)

mongoose.connect(process.env.MONGO_URI)
  .then(() => {                    
    app.listen(3000, () => {
      console.log("Server running on port 3000")
    })
    initScheduler()
  })
  .catch(err => console.error("Startup error:", err))


