import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import userRoute from "./routes/v1/userRoute.js"
import workflowRoute from "./routes/v1/workflowRoute.js"
import webhookRoute from "./routes/v1/webhookRoute.js"
import { initScheduler } from "./services/scheduler.js"

dotenv.config()
const app=express()
app.use(express.json())

app.get("/",(req,res)=>{   
    res.status(200).json({message:"All Ok"})
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


