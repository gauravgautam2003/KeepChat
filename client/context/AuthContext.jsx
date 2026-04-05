import { createContext, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

const TOKEN_STORAGE_KEY = "token";

const getStoredToken = () => sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(getStoredToken);
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const socketRef = useRef(null);

    const connectSocket = useCallback((userData) => {
        if (!userData) return;

        socketRef.current?.off("getOnlineUsers");
        socketRef.current?.disconnect();

        const newSocket = io(backendUrl, {
            autoConnect: true,
            transports: ["websocket", "polling"],
            query: {
                userId: userData._id,
            },
        });

        newSocket.on("getOnlineUsers", (userIds) => {
            setOnlineUsers(userIds);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
            }
        } catch (error) {
            if (error.response?.status === 401) return;
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsAuthLoading(false);
        }
    }, [connectSocket]);

    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                setAuthUser(data.userData);
                connectSocket(data.userData);
                axios.defaults.headers.common.token = data.token;
                axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
                setToken(data.token);
                sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
                localStorage.removeItem(TOKEN_STORAGE_KEY);
                toast.success(data.message);
                setIsAuthLoading(false);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const logout = () => {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem("selectedChatUserId");
        localStorage.removeItem("selectedChatUserId");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        setIsAuthLoading(false);
        delete axios.defaults.headers.common.token;
        delete axios.defaults.headers.common.Authorization;
        socketRef.current?.off("getOnlineUsers");
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocket(null);
        toast.success("Logout successfully!");
    };

    const updateProfile = async (body) => {
        try {
            const { data } = await axios.put("/api/auth/update-profile", body);
            if (data.success) {
                setAuthUser(data.updatedUser);
                toast.success("Profile updated successfully!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    useEffect(() => {
        if (token) {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            axios.defaults.headers.common.token = token;
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;
            setIsAuthLoading(true);
            checkAuth();
        } else {
            setIsAuthLoading(false);
        }
    }, [checkAuth, token]);

    useEffect(() => () => {
        socketRef.current?.off("getOnlineUsers");
        socketRef.current?.disconnect();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                axios,
                authUser,
                isAuthLoading,
                onlineUsers,
                socket,
                login,
                logout,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
