import jwt from "jsonwebtoken";

export const generateToken = (userId) => {
    try {
        const token = jwt.sign({ userId }, process.env.JWT_SECRET);
        return token;
    } catch (error) {
        console.log(error);
    }
}
