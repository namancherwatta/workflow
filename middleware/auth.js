import jwt from "jsonwebtoken"

// JWT auth middleware — validates Bearer token and attaches userId to the request
// All protected routes must pass through this before reaching the controller
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] // strip "Bearer " prefix
  if (!token) return res.status(401).json({ message: "No token provided" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user   = decoded
    req.userId = decoded._id
    next()
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

export default auth
