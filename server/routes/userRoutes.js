import express from 'express'
import { signup, login, updateProfile } from '../controllers/userController.js'
import {protectRoutes } from '../middleware/auth.js';
import { checkAuth } from '../controllers/userController.js';

const userRouter = express.Router()

userRouter.post("/signup",signup);
userRouter.post("/login",login);
userRouter.put("/update-profile",protectRoutes, updateProfile)
userRouter.get("/check",protectRoutes, checkAuth)

export default userRouter