import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

export const ChatContext = createContext();
const SELECTED_CHAT_STORAGE_KEY = "selectedChatUserId";

const normalizeId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value._id) return normalizeId(value._id);
    return value.toString?.() || "";
};

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUserState] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const { socket, axios, authUser, onlineUsers } = useContext(AuthContext);
    const selectedUserRef = useRef(null);
    const authUserRef = useRef(null);

    const setSelectedUser = useCallback((user) => {
        setSelectedUserState(user);
        setIsRightSidebarOpen(false);

        if (user?._id) {
            sessionStorage.setItem(SELECTED_CHAT_STORAGE_KEY, user._id);
            localStorage.removeItem(SELECTED_CHAT_STORAGE_KEY);
        } else {
            sessionStorage.removeItem(SELECTED_CHAT_STORAGE_KEY);
            localStorage.removeItem(SELECTED_CHAT_STORAGE_KEY);
            setMessages([]);
        }
    }, []);

    const getUsers = useCallback(async ({ showLoader = true } = {}) => {
        try {
            const { data } = await axios.get("/api/messages/users", { showLoader });
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [axios]);

    const getMessages = useCallback(async (userId, { showLoader = true } = {}) => {
        try {
            const { data } = await axios.get(`/api/messages/${userId}`, { showLoader });
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [axios]);

    const sendMessage = useCallback(async (messageData) => {
        if (!selectedUser?._id || !authUser?._id) return;

        const authUserId = normalizeId(authUser._id);
        const selectedUserId = normalizeId(selectedUser._id);

        const clientTempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const optimisticMessage = {
            _id: clientTempId,
            clientTempId,
            senderId: authUserId,
            receiverId: selectedUserId,
            text: messageData.text || "",
            image: messageData.image || "",
            seen: false,
            createdAt: new Date().toISOString(),
            pending: true,
        };

        setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

        try {
            const { data } = await axios.post(`/api/messages/send/${selectedUserId}`, {
                ...messageData,
                clientTempId,
            }, {
                showLoader: false,
            });
            if (data.success) {
                setMessages((prevMessages) =>
                    prevMessages.map((message) =>
                        message.clientTempId === clientTempId
                            ? {
                                ...data.newMessage,
                                senderId: normalizeId(data.newMessage.senderId),
                                receiverId: normalizeId(data.newMessage.receiverId),
                                pending: false,
                            }
                            : message
                    )
                );
            } else {
                setMessages((prevMessages) => prevMessages.filter((message) => message.clientTempId !== clientTempId));
                toast.error(data.message);
            }
        } catch (error) {
            setMessages((prevMessages) => prevMessages.filter((message) => message.clientTempId !== clientTempId));
            toast.error(error.response?.data?.message || error.message);
        }
    }, [authUser?._id, axios, selectedUser]);

    const deleteMessage = useCallback(async (messageIds, mode = "everyone") => {
        const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
        const normalizedIds = ids.map((id) => normalizeId(id)).filter(Boolean);
        if (!normalizedIds.length) return;

        const previousMessages = messages;

        if (mode === "me") {
            setMessages((prevMessages) =>
                prevMessages.filter((message) => !normalizedIds.includes(normalizeId(message._id)))
            );
        } else {
            setMessages((prevMessages) =>
                prevMessages.map((message) =>
                    normalizedIds.includes(normalizeId(message._id))
                        ? { ...message, text: "", image: "", isDeleted: true, pending: false }
                        : message
                )
            );
        }

        try {
            let data;

            try {
                const response = await axios.post("/api/messages/delete", {
                    messageIds: normalizedIds,
                    mode,
                }, {
                    showLoader: false,
                });
                data = response.data;
            } catch (error) {
                const isSingleDeleteFallback = error.response?.status === 404 && normalizedIds.length === 1;

                if (!isSingleDeleteFallback) {
                    throw error;
                }

                const fallbackResponse = await axios.delete(`/api/messages/${normalizedIds[0]}`, {
                    data: { mode },
                    showLoader: false,
                });
                data = fallbackResponse.data;
            }

            if (!data.success) {
                throw new Error(data.message);
            }
        } catch (error) {
            setMessages(previousMessages);
            toast.error(error.response?.data?.message || error.message);
            if (selectedUserRef.current?._id) {
                getMessages(selectedUserRef.current._id, { showLoader: false });
            }
        }
    }, [axios, getMessages, messages]);

    const subscribeToMessages = useCallback(() => {
        if (!socket || !authUser) return;

        socket.on("newMessage", (newMessage) => {
            const senderId = normalizeId(newMessage.senderId);
            const receiverId = normalizeId(newMessage.receiverId);
            const authUserId = normalizeId(authUserRef.current?._id);
            const selectedUserId = normalizeId(selectedUserRef.current?._id);
            const isSentByMe = senderId === authUserId;
            const isRelevantToCurrentChat =
                (selectedUserId && senderId === selectedUserId) ||
                (selectedUserId && isSentByMe && receiverId === selectedUserId);

            setMessages((prevMessages) => {
                if (prevMessages.some((message) => normalizeId(message._id) === normalizeId(newMessage._id))) {
                    return prevMessages;
                }

                if (newMessage.clientTempId) {
                    const hasOptimisticVersion = prevMessages.some(
                        (message) => message.clientTempId === newMessage.clientTempId
                    );

                    if (hasOptimisticVersion) {
                        return prevMessages.map((message) =>
                            message.clientTempId === newMessage.clientTempId
                                ? { ...newMessage, pending: false }
                                : message
                        );
                    }
                }

                if (isRelevantToCurrentChat) {
                    if (!isSentByMe) {
                        axios.patch(`/api/messages/mark/${newMessage._id}`, {}, { showLoader: false });
                    }
                    return [...prevMessages, {
                        ...newMessage,
                        senderId,
                        receiverId,
                    }];
                }

                return prevMessages;
            });

            if (!isRelevantToCurrentChat && !isSentByMe) {
                setUnseenMessages((prevUnseenMessages) => ({
                    ...prevUnseenMessages,
                    [senderId]: (prevUnseenMessages[senderId] || 0) + 1,
                }));
            }

            if (isRelevantToCurrentChat && selectedUserId) {
                getMessages(selectedUserId, { showLoader: false });
            }

            getUsers({ showLoader: false });
        });

        socket.on("messageSeen", ({ messageId }) => {
            setMessages((prevMessages) =>
                prevMessages.map((message) =>
                    normalizeId(message._id) === normalizeId(messageId) ? { ...message, seen: true } : message
                )
            );
        });

        socket.on("messageDeleted", ({ messageId, text, image, isDeleted }) => {
            setMessages((prevMessages) =>
                prevMessages.map((message) =>
                    normalizeId(message._id) === normalizeId(messageId)
                        ? { ...message, text, image, isDeleted: Boolean(isDeleted), pending: false }
                        : message
                )
            );
        });

        socket.on("messageRemoved", ({ messageId }) => {
            setMessages((prevMessages) =>
                prevMessages.filter((message) => normalizeId(message._id) !== normalizeId(messageId))
            );
        });
    }, [authUser, axios, getMessages, getUsers, socket]);

    const unSubscribeFromMessages = useCallback(() => {
        if (socket) {
            socket.off("newMessage");
            socket.off("messageSeen");
            socket.off("messageDeleted");
            socket.off("messageRemoved");
        }
    }, [socket]);

    useEffect(() => {
        subscribeToMessages();
        return () => unSubscribeFromMessages();
    }, [subscribeToMessages, unSubscribeFromMessages]);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        authUserRef.current = authUser;
    }, [authUser]);

    useEffect(() => {
        const storedSelectedUserId = sessionStorage.getItem(SELECTED_CHAT_STORAGE_KEY) || localStorage.getItem(SELECTED_CHAT_STORAGE_KEY);
        const activeSelectedUserId = normalizeId(selectedUser?._id) || storedSelectedUserId;

        if (!activeSelectedUserId) return;

        const refreshedSelectedUser = users.find((user) => normalizeId(user._id) === activeSelectedUserId);

        if (refreshedSelectedUser) {
            setSelectedUserState((currentSelectedUser) => {
                if (normalizeId(currentSelectedUser?._id) === normalizeId(refreshedSelectedUser._id) && JSON.stringify(currentSelectedUser) === JSON.stringify(refreshedSelectedUser)) {
                    return currentSelectedUser;
                }

                return refreshedSelectedUser;
            });
        } else if (users.length > 0) {
            setSelectedUser(null);
        }
    }, [selectedUser?._id, setSelectedUser, users]);

    useEffect(() => {
        if (selectedUser?._id) {
            getMessages(selectedUser._id);
        }
    }, [getMessages, selectedUser?._id]);

    return (
        <ChatContext.Provider
            value={{
                messages,
                users,
                selectedUser,
                onlineUsers,
                getUsers,
                getMessages,
                sendMessage,
                deleteMessage,
                setSelectedUser,
                unseenMessages,
                setUnseenMessages,
                isRightSidebarOpen,
                setIsRightSidebarOpen,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
