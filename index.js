import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import userRoute from "./routes/v1/userRoute.js"
import workflowRoute from "./routes/v1/workflowRoute.js"

dotenv.config()
const app=express()
app.use(express.json())

app.get("/",(req,res)=>{
    console.log(req)    
    res.status(200).json({message:"All Ok"})
})

app.use("/api/v1/user",userRoute)
app.use("/api/v1/workflows", workflowRoute)


mongoose.connect(process.env.MONGO_URI)
.then(app.listen(3000,()=>{
    console.log("DB connected")
    console.log("App is listening at 3000 port")
}))
.catch((err) => console.error("Error starting up:", err));


