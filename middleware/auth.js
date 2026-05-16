import jwt from "jsonwebtoken"

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] // strip "Bearer "
  if (!token) return res.status(401).json({ message: "No token" })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    req.userId = decoded._id
    next()
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

export default auth