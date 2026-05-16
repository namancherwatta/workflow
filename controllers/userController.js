import user from "../models/userModel.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body
    const hashedPassword = bcrypt.hashSync(password, 10)
    const dbUser = await user.create({ name, email, password: hashedPassword })
    dbUser.password = "XXX"
    return res.status(201).json(dbUser)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}


const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const dbUser = await user.findOne({ email })
    if (!dbUser) return res.status(404).json({ message: "User not found" })

    const check_pw = bcrypt.compareSync(password, dbUser.password)
    if (!check_pw) return res.status(400).json({ message: "Wrong password" }) 

    const token = jwt.sign({ _id: dbUser._id, email }, process.env.JWT_SECRET, { expiresIn: "1h" }) 
    res.status(200).json({ token, message: `${dbUser.name} logged in` })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export {register,login}