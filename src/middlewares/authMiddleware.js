import jwt from "jsonwebtoken";
import User from "../models/model.user.js";

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Changed from decoded.userId to decoded.user.id
    const user = await User.findById(decoded.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default authenticateUser;