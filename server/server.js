import express from 'express'
import cors from 'cors'
import http from 'http'
import connectDB from './lib/db.js';
import { Server } from 'socket.io'
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import dotenv from 'dotenv'
dotenv.config({quiet: true});

import User from './models/user.js';
import dns from 'dns';

// Set custom DNS servers (Google's public DNS)
dns.setServers(["8.8.4.4", "8.8.8.8"])

//sever create using express app and HTTP
const app = express()
const server = http.createServer(app)// used for to allow socket.io functionality
const PORT = process.env.PORT || 5000;

//initialize socket.io
export const io = new Server(server, {
    cors: { origin: "https://keep-chat.vercel.app/" }
})

//store online users
export const userSocketMap = {}; //{userId: [socketId1, socketId2]}
const getUserRoom = (userId) => `user:${userId}`;
const emitToUser = (targetUserId, eventName, payload) => {
    if (!targetUserId) return;
    io.to(getUserRoom(targetUserId.toString())).emit(eventName, payload);
};

//Socket.io connection handler

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId

    if (userId) {
        console.log("user Connected", userId)
        // Add new socketId to user's array
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = [];
        }
        userSocketMap[userId].push(socket.id);
        socket.join(getUserRoom(userId));
        User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch((error) => {
            console.log("Error updating active user status", error.message);
        });
    }

    // Broadcast online users to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("call:offer", ({ to, offer, callType = "audio", caller }) => {
        emitToUser(to, "call:incoming", {
            from: userId,
            offer,
            callType,
            caller,
        });
    });

    socket.on("call:answer", ({ to, answer }) => {
        emitToUser(to, "call:answered", {
            from: userId,
            answer,
        });
    });

    socket.on("call:ice-candidate", ({ to, candidate }) => {
        emitToUser(to, "call:ice-candidate", {
            from: userId,
            candidate,
        });
    });

    socket.on("call:reject", ({ to, reason = "rejected" }) => {
        emitToUser(to, "call:rejected", {
            from: userId,
            reason,
        });
    });

    socket.on("call:end", ({ to }) => {
        emitToUser(to, "call:ended", {
            from: userId,
        });
    });

    socket.on("disconnect", () => {
        if (userId && userSocketMap[userId]) {
            console.log("User Disconnected", userId)
            // Remove this specific socketId
            userSocketMap[userId] = userSocketMap[userId].filter(id => id !== socket.id);

            // If no more connections left, delete user from map
            if (userSocketMap[userId].length === 0) {
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
app.use(express.json({ limit: "25mb" }))
app.use(express.urlencoded({ limit: "25mb", extended: true }))

//connect db
await connectDB();

app.use("/api/status", (req, res) => res.send("server is live"))
app.use("/api/auth", userRouter)
app.use("/api/messages", messageRouter)



server.listen(PORT, () => console.log(`server is running: http://localhost:${PORT}`))
