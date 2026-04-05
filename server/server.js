import express from 'express'
import cors from 'cors'
import http from 'http'
import connectDB from './lib/db.js';
import {Server} from 'socket.io'
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import dotenv from 'dotenv'
import User from './models/user.js';
dotenv.config();

//sever create using express app and HTTP
const app = express()
const server = http.createServer(app)// used for to allow socket.io functionality
const PORT = process.env.PORT || 5000;

//initialize socket.io
export const io = new Server(server, {
    cors: {origin:"*"}
})

//store online users
export const userSocketMap = {}; //{userId: [socketId1, socketId2]}

//Socket.io connection handler

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId
    
    if(userId) {
        console.log("user Connected", userId)
        // Add new socketId to user's array
        if(!userSocketMap[userId]){
            userSocketMap[userId] = [];
        }
        userSocketMap[userId].push(socket.id);
        User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch((error) => {
            console.log("Error updating active user status", error.message);
        });
    }
    
    // Broadcast online users to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("call:offer", ({ to, offer, callType = "audio", caller }) => {
        const receiverSocketIds = userSocketMap[to?.toString()];
        if (receiverSocketIds && Array.isArray(receiverSocketIds)) {
            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit("call:incoming", {
                    from: userId,
                    offer,
                    callType,
                    caller,
                });
            });
        }
    });

    socket.on("call:answer", ({ to, answer }) => {
        const receiverSocketIds = userSocketMap[to?.toString()];
        if (receiverSocketIds && Array.isArray(receiverSocketIds)) {
            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit("call:answered", {
                    from: userId,
                    answer,
                });
            });
        }
    });

    socket.on("call:ice-candidate", ({ to, candidate }) => {
        const receiverSocketIds = userSocketMap[to?.toString()];
        if (receiverSocketIds && Array.isArray(receiverSocketIds)) {
            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit("call:ice-candidate", {
                    from: userId,
                    candidate,
                });
            });
        }
    });

    socket.on("call:reject", ({ to, reason = "rejected" }) => {
        const receiverSocketIds = userSocketMap[to?.toString()];
        if (receiverSocketIds && Array.isArray(receiverSocketIds)) {
            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit("call:rejected", {
                    from: userId,
                    reason,
                });
            });
        }
    });

    socket.on("call:end", ({ to }) => {
        const receiverSocketIds = userSocketMap[to?.toString()];
        if (receiverSocketIds && Array.isArray(receiverSocketIds)) {
            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit("call:ended", {
                    from: userId,
                });
            });
        }
    });

    socket.on("disconnect", () => {
        if(userId && userSocketMap[userId]){
            console.log("User Disconnected", userId)
            // Remove this specific socketId
            userSocketMap[userId] = userSocketMap[userId].filter(id => id !== socket.id);
            
            // If no more connections left, delete user from map
            if(userSocketMap[userId].length === 0){
                delete userSocketMap[userId];
                User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch((error) => {
                    console.log("Error updating last seen", error.message);
                });
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    })
})
// middleware setup here
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
}));
app.use(express.json({limit:"25mb"}))
app.use(express.urlencoded({limit: "25mb", extended: true}))

//connect db
await connectDB();

app.use("/api/status",(req,res) => res.send("server is live"))
app.use("/api/auth", userRouter)
app.use("/api/messages",messageRouter)



server.listen(PORT, () => console.log(`server is running: http://localhost:${PORT}`))
