import { useContext } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import { AuthContext } from '../context/AuthContext'

const App = () => {
    const { authUser, isAuthLoading } = useContext(AuthContext);

    if (isAuthLoading) {
        return (
            <div className="app-shell flex min-h-screen items-center justify-center bg-[#f0f2f5]">
                <div className="flex items-center gap-3 rounded-[12px] border border-[#d1d7db] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(11,20,26,0.08)]">
                    <img src="/favicon.svg" alt="QuickChat" className="h-10 w-10 rounded-full" />
                    <div>
                        <p className="text-sm font-semibold text-[#111b21]">KeepChat</p>
                        <p className="text-xs text-[#667781]">Loading your chats...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="app-shell min-h-screen">
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: "#111b21",
                        color: "#e9edef",
                        border: "1px solid rgba(255,255,255,0.08)",
                    },
                }}
            />
            <Routes>
                <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
                <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
                <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
            </Routes>
        </div>
    )
}

export default App
