import jwt from "jsonwebtoken"

const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send("No token");

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  req.userId = decoded._id
  next();
};

export default auth