import express from 'express'
import { protectRoutes } from '../middleware/auth.js'
import { deleteMessage, getMessage, getUserForSidebar, markMessageAsSeen, sendMessage } from '../controllers/messageController.js'
const messageRouter = express.Router()

messageRouter.get("/users", protectRoutes, getUserForSidebar)
messageRouter.patch("/mark/:id", protectRoutes, markMessageAsSeen)
messageRouter.post("/delete", protectRoutes, deleteMessage)
messageRouter.delete("/:id", protectRoutes, deleteMessage)
messageRouter.get("/:id", protectRoutes, getMessage)
messageRouter.post("/send/:id",protectRoutes, sendMessage)

export default messageRouter

