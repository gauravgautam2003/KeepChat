import jwt from "jsonwebtoken"
import User from "../models/user.js"


//middleware to protect routes
export const protectRoutes = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = req.headers.token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

        if (!token) {
            return res.status(401).json({ success: false, message: "Authentication token missing" });
        }

        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        // jwt.verify throws on invalid/expired token
        console.log(error);
        return res.status(401).json({ success: false, message: error.message });
    }
};
