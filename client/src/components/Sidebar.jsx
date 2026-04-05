import { useEffect, useRef, useState } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { ChatContext } from '../../context/ChatContext'
import { formatLastSeen } from '../lib/utils'

const Sidebar = () => {

    const { authUser, logout, onlineUsers = [] } = useContext(AuthContext) || {};
    const { getUsers, users = [], selectedUser, setSelectedUser, unseenMessages = {}, setUnseenMessages } = useContext(ChatContext) || {};
    const [input, setInput] = useState("")
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef(null)


    const navigate = useNavigate();

    const filterUsers = input ? users.filter((user) => (user?.name || "").toLowerCase().includes(input.toLowerCase())) : users;

    useEffect(() => {
        getUsers();
    },[getUsers, onlineUsers])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className={`min-h-0 border-r border-[#d1d7db] bg-[#ffffff] text-[#111b21] ${selectedUser ? "hidden lg:block" : ""}`}>
            <div className='flex h-full min-h-0 flex-col'>
                <div className='border-b border-[#d1d7db] bg-[#f0f2f5] p-3'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                            <img src={authUser?.profilePic || assets.avatar_icon} alt={authUser?.name || "Profile"} className='h-10 w-10 rounded-full object-cover border border-[#dfe5e7] bg-[#d9fdd3]' />
                            <div>
                                <p className='text-sm font-semibold text-[#111b21]'>QuickChat</p>
                                <p className='text-xs text-[#667781]'>WhatsApp style chat</p>
                            </div>
                        </div>
                        <div ref={menuRef} className='relative'>
                            <button onClick={() => setIsMenuOpen((prev) => !prev)} className='rounded-full p-2 transition hover:bg-[#e9edef]'>
                                <img src={assets.menu_icon} alt="" className='h-5 w-5 cursor-pointer opacity-95 [filter:brightness(0)_saturate(100%)_invert(41%)_sepia(10%)_saturate(513%)_hue-rotate(153deg)_brightness(92%)_contrast(90%)]' />
                            </button>
                            <div className={`absolute right-0 top-full z-20 mt-2 w-44 rounded-md border border-[#d1d7db] bg-white p-2 shadow-xl ${isMenuOpen ? 'block' : 'hidden'}`}>
                                <button onClick={() => { setIsMenuOpen(false); navigate("/profile") }} className='w-full rounded-md px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'>Edit Profile</button>
                                <button onClick={() => { setIsMenuOpen(false); logout() }} className='w-full rounded-md px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'>Logout</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='border-b border-[#e9edef] bg-white px-3 py-2'>
                    <div className='flex items-center gap-3 rounded-[8px] bg-[#f0f2f5] px-3 py-2'>
                        <img src={assets.search_icon} alt="" className='w-4 opacity-50' />
                        <input onChange={(e) => setInput(e.target.value)} value={input} type="text" className='w-full bg-transparent text-sm text-[#111b21] outline-none placeholder:text-[#667781]' placeholder='Search or start new chat'/>
                    </div>
                </div>

                <div className='flex-1 min-h-0 overflow-y-auto bg-white'>
                    <div className='flex flex-col'>
                        {filterUsers.map((user) => (
                            <button onClick={()=> {setSelectedUser(user); setUnseenMessages((prev) => ({...prev, [user._id]: 0 }))}} key={user._id} className={`relative flex min-w-0 items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f5f6f6] ${selectedUser?._id === user._id ? 'bg-[#f0f2f5]' : ''}`}>
                                <img src={user?.profilePic || assets.avatar_icon} alt={user.name} className='h-12 w-12 rounded-full object-cover'/>
                                <div className='min-w-0 flex-1 overflow-hidden border-b border-[#f0f2f5] pb-3 pr-10'>
                                    <div className='flex items-center justify-between gap-3'>
                                        <p className='min-w-0 flex-1 truncate text-sm font-medium text-[#111b21]'>{user.name}</p>
                                        <span className={`max-w-[92px] shrink-0 truncate text-[11px] ${onlineUsers.includes(user._id) ? 'text-[#00a884]' : 'text-[#667781]'}`}>{onlineUsers.includes(user._id) ? 'Active now' : formatLastSeen(user.lastSeen)}</span>
                                    </div>
                                    <p className='truncate text-xs text-[#667781]'>{user.bio || "Tap to start chatting"}</p>
                                </div>
                                {(unseenMessages?.[user._id] || 0) > 0 && <span className='absolute right-5 top-4 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1 text-[11px] font-semibold text-white'>{unseenMessages?.[user._id]}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Sidebar
