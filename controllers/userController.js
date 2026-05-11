import user from "../models/userModel.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const register=async(req,res)=>{
    
    const {name,email,password} = req.body
    const hashedPassword= bcrypt.hashSync(password,10)
    const dbUser= await user.create({
        name:name,
        email:email,
        password:hashedPassword
    })
    
    dbUser.password = "XXX";

    return res.status(201).json(dbUser)

}

const login=async(req,res)=>{

    const {email,password} = req.body
    const dbUser= await user.findOne({email:email})
    if(!dbUser){
        res.status(404).json({message : "User mail does not exists"})
    }
    
    const check_pw = bcrypt.compareSync(password,dbUser.password)

    if(!check_pw){
        res.status(400).json({message: "wrong password"})
    }
    
    const token= jwt.sign({_id:dbUser._id,email:email},process.env.JWT_SECRET,{expiresIn:"1hr"})

    res.status(200).json({token:token,message :`${dbUser.name} logged in successfully`})

}

export {register,login}