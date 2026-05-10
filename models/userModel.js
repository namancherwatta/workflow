import mongoose from "mongoose";

const userSchema= new mongoose.Schema({
    name:{
        type:String,
        required: true,
        trim:true,
        minlength:2
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        required:true,
        minLength:6
    }
})

export default mongoose.model("user",userSchema)