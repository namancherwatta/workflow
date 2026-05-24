import user from "../models/userModel.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

// Register a new user — hashes password before saving
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password)
      return res.status(400).json({ message: "name, email and password are required" })

    const hashedPassword = bcrypt.hashSync(password, 10)
    const dbUser = await user.create({ name, email, password: hashedPassword })

    // Strip password from response before sending
    dbUser.password = "XXX"
    return res.status(201).json(dbUser)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Login — verifies credentials and returns a signed JWT
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const dbUser = await user.findOne({ email })
    if (!dbUser) return res.status(404).json({ message: "User not found" })

    const isPasswordValid = bcrypt.compareSync(password, dbUser.password)
    if (!isPasswordValid) return res.status(400).json({ message: "Wrong password" })

    // Token expires in 1 hour — client must re-login after expiry
    const token = jwt.sign({ _id: dbUser._id, email }, process.env.JWT_SECRET, { expiresIn: "1h" })
    res.status(200).json({ token, message: `${dbUser.name} logged in` })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export { register, login }
