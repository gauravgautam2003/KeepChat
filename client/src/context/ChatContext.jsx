import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import { userDummyData } from "../assets/assets";

export const ChatContext = createContext();
const SELECTED_CHAT_STORAGE_KEY = "selectedChatUserId";
const PREVIEW_VIEWER = {
    _id: "visitor-preview",
    name: "Visitor",
    bio: "Preview mode is active.",
};

const normalizeId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value._id) return normalizeId(value._id);
    return value.toString?.() || "";
};

const createPreviewTimestamp = (minutesAgo) => new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

const PREVIEW_USERS = userDummyData.map((user, index) => ({
    ...user,
    phone: user.phone || `+91 98765${(43210 + index).toString().slice(-5)}`,
    lastSeen: createPreviewTimestamp(index === 0 ? 1 : (index + 1) * 9),
    isPreviewOnline: index < 2,
    bio: user.bio || "Available on KeepChat preview",
}));

const PREVIEW_USER_IDS = new Set(PREVIEW_USERS.map((user) => normalizeId(user._id)));

const PREVIEW_MESSAGES = PREVIEW_USERS.reduce((conversationMap, user, index) => {
    conversationMap[user._id] = [
        {
            _id: `preview-${user._id}-1`,
            senderId: user._id,
            receiverId: PREVIEW_VIEWER._id,
            text: `Hi, I am ${user.name}. This is how chats look inside KeepChat.`,
            seen: true,
            createdAt: createPreviewTimestamp(48 - index * 3),
        },
        {
            _id: `preview-${user._id}-2`,
            senderId: PREVIEW_VIEWER._id,
            receiverId: user._id,
            text: "The layout feels live, but preview mode keeps messaging locked.",
            seen: true,
            createdAt: createPreviewTimestamp(42 - index * 3),
        },
        {
            _id: `preview-${user._id}-3`,
            senderId: user._id,
            receiverId: PREVIEW_VIEWER._id,
            text: "Create your account whenever you are ready to start real conversations.",
            seen: index % 2 === 0,
            createdAt: createPreviewTimestamp(35 - index * 3),
        },
    ];

    return conversationMap;
}, {});

const PREVIEW_UNSEEN_MESSAGES = PREVIEW_USERS.reduce((accumulator, user, index) => {
    accumulator[user._id] = index === 0 ? 0 : index % 2;
    return accumulator;
}, {});

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUserState] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const { socket, axios, authUser, onlineUsers, wakeBackend } = useContext(AuthContext);
    const selectedUserRef = useRef(null);
    const authUserRef = useRef(null);
    const isPreviewMode = !authUser?._id;
    const viewerProfile = authUser || PREVIEW_VIEWER;

    const setSelectedUser = useCallback((user) => {
        setSelectedUserState(user);
        setIsRightSidebarOpen(false);

        if (!authUser?._id) {
            if (!user?._id) {
                setMessages([]);
            }
            return;
        }

        if (user?._id) {
            sessionStorage.setItem(SELECTED_CHAT_STORAGE_KEY, user._id);
            localStorage.removeItem(SELECTED_CHAT_STORAGE_KEY);
        } else {
            sessionStorage.removeItem(SELECTED_CHAT_STORAGE_KEY);
            localStorage.removeItem(SELECTED_CHAT_STORAGE_KEY);
            setMessages([]);
        }
    }, [authUser?._id]);

    const ensureBackendAwake = useCallback(async ({ force = false, showLoader = false } = {}) => {
        if (!wakeBackend) return true;
        try {
            await wakeBackend({ force, showLoader });
            return true;
        } catch {
            return false;
        }
    }, [wakeBackend]);

    const getUsers = useCallback(async ({ showLoader = true } = {}) => {
        if (!authUser?._id) {
            setUsers(PREVIEW_USERS);
            setUnseenMessages(PREVIEW_UNSEEN_MESSAGES);
            return PREVIEW_USERS;
        }

        try {
            await ensureBackendAwake({ showLoader });
            const { data } = await axios.get("/api/messages/users", { showLoader });
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [authUser?._id, axios, ensureBackendAwake]);

    const getMessages = useCallback(async (userId, { showLoader = true } = {}) => {
        if (!authUser?._id) {
            setMessages(PREVIEW_MESSAGES[userId] || []);
            return PREVIEW_MESSAGES[userId] || [];
        }

        try {
            await ensureBackendAwake({ showLoader });
            const { data } = await axios.get(`/api/messages/${userId}`, { showLoader });
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    }, [authUser?._id, axios, ensureBackendAwake]);

    const sendMessage = useCallback(async (messageData) => {
        if (!authUser?._id) {
            toast.error("Please create your account");
            return false;
        }

        if (!selectedUser?._id || !authUser?._id) return false;

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
            await ensureBackendAwake({ force: true, showLoader: false });
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
                return true;
            } else {
                setMessages((prevMessages) => prevMessages.filter((message) => message.clientTempId !== clientTempId));
                toast.error(data.message);
                return false;
            }
        } catch (error) {
            setMessages((prevMessages) => prevMessages.filter((message) => message.clientTempId !== clientTempId));
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    }, [authUser?._id, axios, ensureBackendAwake, selectedUser]);

    const deleteMessage = useCallback(async (messageIds, mode = "everyone") => {
        if (!authUser?._id) {
            toast.error("Please create your account");
            return false;
        }

        const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
        const normalizedIds = ids.map((id) => normalizeId(id)).filter(Boolean);
        if (!normalizedIds.length) return false;

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
                await ensureBackendAwake({ force: true, showLoader: false });
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

                await ensureBackendAwake({ force: true, showLoader: false });
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
            return false;
        }
        return true;
    }, [authUser?._id, axios, ensureBackendAwake, getMessages, messages]);

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
        if (!authUser?._id) {
            setUsers(PREVIEW_USERS);
            setUnseenMessages(PREVIEW_UNSEEN_MESSAGES);
            setSelectedUserState((currentSelectedUser) => {
                if (currentSelectedUser?._id && PREVIEW_USER_IDS.has(normalizeId(currentSelectedUser._id))) {
                    return currentSelectedUser;
                }

                return PREVIEW_USERS[0] || null;
            });
            return;
        }

        setUsers([]);
        setUnseenMessages({});
        setMessages([]);
        setIsRightSidebarOpen(false);
        setSelectedUserState((currentSelectedUser) => {
            if (currentSelectedUser?._id && PREVIEW_USER_IDS.has(normalizeId(currentSelectedUser._id))) {
                return null;
            }

            return currentSelectedUser;
        });
    }, [authUser?._id]);

    useEffect(() => {
        if (!authUser?._id) return;

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
                isPreviewMode,
                viewerProfile,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
