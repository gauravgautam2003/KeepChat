// Get all users except the logged in user

import Message from "../models/message.js";
import User from "../models/user.js"
import uploadOnCloudinary from '../lib/cloudinary.js'
import {io, userSocketMap} from '../server.js'

export const getUserForSidebar = async (req, res) => {
    try {
        const userId = req.user._id
        const filterUsers = await User.find({_id: {$ne:  userId}}).select("-password");

        // Count number of messages not seen

        const unseenMessages = {}
        const promises = filterUsers.map(async (user) =>{
            const messages = await Message.find({senderId: user._id,  receiverId:userId, seen:false})
            if(messages.length > 0){
                unseenMessages[user._id] = messages.length
            }
        })
        await Promise.all(promises);
        return res.json({success:true, users: filterUsers, unseenMessages})
    } catch (error) {
        return res.json({success:false, error:error.message})
        
    }
}

//get all messages for selected user

export const getMessage = async (req,res) => {
    try {
        const {id: selectedUserId} = req.params;
        const myId = req.user._id

        const messages = await Message.find({
            deletedFor: { $ne: myId },
            $or:[
                {senderId: myId, receiverId: selectedUserId},
                {senderId: selectedUserId, receiverId: myId},
            ]
            
        }).sort({ createdAt: 1 })
        await Message.updateMany({senderId: selectedUserId, receiverId: myId}, {seen: true})
        return res.json({success:true, messages})
    } catch (error) {
        return res.json({success:false, error:error.message})
    }
}

//api  to mark messages seen using message Id

export const markMessageAsSeen = async (req,res) => {
    try {
        const {id} = req.params
        const message = await Message.findByIdAndUpdate(id, {seen:true}, { new: true })

        if (message) {
            const senderSocketIds = userSocketMap[message.senderId?.toString()];
            if (senderSocketIds && Array.isArray(senderSocketIds)) {
                senderSocketIds.forEach((socketId) => {
                    io.to(socketId).emit("messageSeen", { messageId: message._id.toString() });
                });
            }
        }

        return res.json({success:true})
    } catch (error) {
        return res.json({success:false, error: error.message})
    }
}

export const deleteMessage = async (req, res) => {
    try {
        const currentUserId = req.user._id.toString();
        const messageIds = Array.isArray(req.body?.messageIds)
            ? req.body.messageIds
            : req.params.id
                ? [req.params.id]
                : [];
        const mode = req.body?.mode === "me" ? "me" : "everyone";

        if (!messageIds.length) {
            return res.status(400).json({ success: false, message: "No messages selected" });
        }

        const messages = await Message.find({ _id: { $in: messageIds } });
        if (!messages.length) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        const updatedMessages = [];
        const removedMessageIds = [];

        for (const message of messages) {
            if (mode === "everyone") {
                if (message.senderId?.toString() !== currentUserId) {
                    continue;
                }

                message.text = "";
                message.image = "";
                message.isDeleted = true;
                await message.save();
                updatedMessages.push(message);

                const deletePayload = {
                    messageId: message._id.toString(),
                    senderId: message.senderId?.toString(),
                    receiverId: message.receiverId?.toString(),
                    isDeleted: true,
                    text: "",
                    image: "",
                };

                const receiverSocketIds = userSocketMap[message.receiverId?.toString()];
                if (receiverSocketIds && Array.isArray(receiverSocketIds)) {
                    receiverSocketIds.forEach((socketId) => {
                        io.to(socketId).emit("messageDeleted", deletePayload);
                    });
                }

                const senderSocketIds = userSocketMap[message.senderId?.toString()];
                if (senderSocketIds && Array.isArray(senderSocketIds)) {
                    senderSocketIds.forEach((socketId) => {
                        io.to(socketId).emit("messageDeleted", deletePayload);
                    });
                }
            } else {
                const alreadyDeletedForUser = message.deletedFor?.some((userId) => userId.toString() === currentUserId);
                if (!alreadyDeletedForUser) {
                    message.deletedFor = [...(message.deletedFor || []), req.user._id];
                    await message.save();
                }

                removedMessageIds.push(message._id.toString());

                const ownSocketIds = userSocketMap[currentUserId];
                if (ownSocketIds && Array.isArray(ownSocketIds)) {
                    ownSocketIds.forEach((socketId) => {
                        io.to(socketId).emit("messageRemoved", {
                            messageId: message._id.toString(),
                        });
                    });
                }
            }
        }

        return res.json({
            success: true,
            message: mode === "everyone" ? "Messages deleted for everyone" : "Messages deleted for you",
            deletedCount: mode === "everyone" ? updatedMessages.length : removedMessageIds.length,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

export const sendMessage = async (req, res) =>{
    try {
        const {text, image, clientTempId} = req.body
        const receiverId = req.params.id
        const senderId = req.user._id

        const trimmedText = text?.trim?.() || ""

        if (!receiverId) {
            return res.status(400).json({ success: false, message: "Receiver is required" })
        }

        if (!trimmedText && !image) {
            return res.status(400).json({ success: false, message: "Message cannot be empty" })
        }

        const receiverUser = await User.findById(receiverId).select("_id")
        if (!receiverUser) {
            return res.status(404).json({ success: false, message: "Receiver not found" })
        }

        let imageUrl = ""; // Default to empty string if no image
        if(image){
            const uploadResponse = await uploadOnCloudinary(image) // Changed to match utility name and handle base64
            if (!uploadResponse) {
                throw new Error("Image upload failed")
            }
            imageUrl = uploadResponse
        }

        const createdMessage = await Message.create({
            senderId,
            receiverId,
            text: trimmedText,
            image:imageUrl
        })
        const newMessageDoc = await Message.findById(createdMessage._id)
        const newMessage = {
            ...newMessageDoc.toObject(),
            clientTempId: clientTempId || null,
        }

        //emit the new message to the receiver's socket

        // Emit message to all receiver's open tabs
        const receiverSocketIds = userSocketMap[receiverId?.toString()]
        if(receiverSocketIds && Array.isArray(receiverSocketIds)){
            receiverSocketIds.forEach(socketId => {
                io.to(socketId).emit("newMessage", newMessage)
            })
        }

        // Emit message to all sender's other open tabs for sync
        const senderSocketIds = userSocketMap[senderId?.toString()]
        if(senderSocketIds && Array.isArray(senderSocketIds)){
            senderSocketIds.forEach(socketId => {
                io.to(socketId).emit("newMessage", newMessage)
            })
        }
        return res.json({success:true, newMessage})
    } catch (error) {
        console.log("Error sending message:", error);
        return res.status(500).json({success:false, message:error.message || "Error sending message"})
    }
}
