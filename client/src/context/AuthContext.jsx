import { createContext, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "https://keep-chat.onrender.com").replace(/\/$/, "");
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

const TOKEN_STORAGE_KEY = "token";
const DEFAULT_REQUEST_MESSAGE = "Server is processing your request...";
const BACKEND_HEARTBEAT_MS = 4 * 60 * 1000;

const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
const getRequestStatusText = (config = {}) => {
    const method = (config.method || "get").toLowerCase();
    const url = (config.url || "").toLowerCase();

    if (url.includes("/api/auth/check")) return "Checking your session...";
    if (url.includes("/api/auth/login")) return "Logging you in...";
    if (url.includes("/api/auth/signup")) return "Creating your account...";
    if (url.includes("/api/auth/update-profile")) return "Saving your profile...";
    if (url.includes("/api/messages/users")) return "Loading your chats...";
    if (method === "get" && /\/api\/messages\/[^/]+$/.test(url)) return "Loading conversation...";

    return DEFAULT_REQUEST_MESSAGE;
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(getStoredToken);
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [activeRequestCount, setActiveRequestCount] = useState(0);
    const [requestStatusText, setRequestStatusText] = useState(DEFAULT_REQUEST_MESSAGE);
    const socketRef = useRef(null);
    const backendWakePromiseRef = useRef(null);
    const lastBackendWakeRef = useRef(0);

    useEffect(() => {
        const releaseLoader = (config) => {
            if (config?.metadata?.showLoader) {
                setActiveRequestCount((count) => Math.max(0, count - 1));
            }
        };

        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                if (config.showLoader === false) {
                    return config;
                }

                config.metadata = {
                    ...(config.metadata || {}),
                    showLoader: true,
                };
                setRequestStatusText(getRequestStatusText(config));
                setActiveRequestCount((count) => count + 1);
                return config;
            },
            (error) => Promise.reject(error),
        );

        const responseInterceptor = axios.interceptors.response.use(
            (response) => {
                releaseLoader(response.config);
                return response;
            },
            (error) => {
                releaseLoader(error.config);
                return Promise.reject(error);
            },
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const wakeBackend = useCallback(async ({ force = false, showLoader = false } = {}) => {
        const now = Date.now();
        if (!force && now - lastBackendWakeRef.current < 30000) {
            return true;
        }

        if (backendWakePromiseRef.current) {
            return backendWakePromiseRef.current;
        }

        backendWakePromiseRef.current = axios.get("/api/status", {
            showLoader,
            timeout: 65000,
        }).then(() => {
            lastBackendWakeRef.current = Date.now();
            return true;
        }).catch((error) => {
            if (error.response) {
                lastBackendWakeRef.current = Date.now();
                return true;
            }

            throw error;
        }).finally(() => {
            backendWakePromiseRef.current = null;
        });

        return backendWakePromiseRef.current;
    }, []);

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
            await wakeBackend({ showLoader: false });
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
    }, [connectSocket, wakeBackend]);

    const login = async (state, credentials) => {
        try {
            await wakeBackend({ force: true, showLoader: true });
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                setAuthUser(data.userData);
                connectSocket(data.userData);
                axios.defaults.headers.common.token = data.token;
                axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
                setToken(data.token);
                localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
                sessionStorage.removeItem(TOKEN_STORAGE_KEY);
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
            await wakeBackend({ force: true, showLoader: true });
            const { data } = await axios.put("/api/auth/update-profile", body);
            if (data.success) {
                setAuthUser(data.updatedUser);
                toast.success("Profile updated successfully!");
                return true;
            }
            toast.error(data.message || "Unable to update profile");
            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    };

    useEffect(() => {
        if (token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
            axios.defaults.headers.common.token = token;
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;
            setIsAuthLoading(true);
            checkAuth();
        } else {
            setIsAuthLoading(false);
        }
    }, [checkAuth, token]);

    useEffect(() => {
        wakeBackend({ force: true, showLoader: false }).catch(() => { });

        const intervalId = setInterval(() => {
            if (document.visibilityState === "visible") {
                wakeBackend({ force: true, showLoader: false }).catch(() => { });
            }
        }, BACKEND_HEARTBEAT_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                wakeBackend({ force: true, showLoader: false }).catch(() => { });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [wakeBackend]);

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
                wakeBackend,
                isRequestProcessing: activeRequestCount > 0,
                requestStatusText,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
