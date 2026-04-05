import { useContext, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { formatLastSeen } from '../lib/utils'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'

const normalizeId = (value) => {
    if (!value) return ""
    if (typeof value === "string") return value
    if (typeof value === "object" && value._id) return normalizeId(value._id)
    return value.toString?.() || ""
}

const ChatContainer = () => {
    const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, deleteMessage } = useContext(ChatContext)
    const { authUser, onlineUsers } = useContext(AuthContext)
    const scrollEnd = useRef(null)
    const menuRef = useRef(null)
    const [input, setInput] = useState("")
    const [openMenuId, setOpenMenuId] = useState(null)
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedMessageIds, setSelectedMessageIds] = useState([])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (input.trim() === "") return null

        await sendMessage({ text: input.trim() })
        setInput("")
    }

    const handleSendImage = async (e) => {
        const file = e.target.files[0]

        if (!file || !file.type.startsWith("image/")) {
            toast.error("select an Image file")
            return
        }

        const reader = new FileReader()
        reader.onloadend = async () => {
            await sendMessage({ image: reader.result })
            e.target.value = ""
        }
        reader.readAsDataURL(file)
    }

    useEffect(() => {
        if (selectedUser) {
            getMessages(selectedUser._id)
        }
    }, [getMessages, selectedUser])

    useEffect(() => {
        if (scrollEnd.current && messages) {
            scrollEnd.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    useEffect(() => {
        setIsSelectionMode(false)
        setSelectedMessageIds([])
        setOpenMenuId(null)
    }, [selectedUser?._id])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const selectedUserId = normalizeId(selectedUser?._id)
    const authUserId = normalizeId(authUser?._id)
    const isSelectedUserOnline = onlineUsers.some((userId) => normalizeId(userId) === selectedUserId)
    const selectedMessages = messages.filter((msg) => selectedMessageIds.includes(normalizeId(msg._id)))
    const canDeleteSelectedForEveryone = selectedMessages.length > 0 && selectedMessages.every((msg) => normalizeId(msg.senderId) === authUserId)

    const resetSelection = () => {
        setIsSelectionMode(false)
        setSelectedMessageIds([])
    }

    const toggleMessageSelection = (messageId) => {
        const normalizedId = normalizeId(messageId)
        setSelectedMessageIds((prev) =>
            prev.includes(normalizedId) ? prev.filter((id) => id !== normalizedId) : [...prev, normalizedId]
        )
    }

    const handleBulkDelete = async (mode) => {
        if (!selectedMessageIds.length) return
        await deleteMessage(selectedMessageIds, mode)
        resetSelection()
    }

    return selectedUser ? (
        <div className='wa-chat-panel relative flex min-h-0 min-w-0 flex-col overflow-hidden'>
            <div className='flex items-center gap-3 border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-3 text-[#111b21]'>
                {isSelectionMode ? (
                    <>
                        <button onClick={resetSelection} className='rounded-full p-1'>
                            <img src={assets.arrow_icon} alt="Back" className='w-6 rotate-180 opacity-60' />
                        </button>
                        <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium'>{selectedMessageIds.length} selected</p>
                            <p className='text-xs text-[#667781]'>Choose delete action</p>
                        </div>
                        <button onClick={() => handleBulkDelete("me")} className='rounded-[8px] px-3 py-2 text-xs font-medium text-[#111b21] transition hover:bg-[#e9edef]'>
                            Delete for me
                        </button>
                        {canDeleteSelectedForEveryone && (
                            <button onClick={() => handleBulkDelete("everyone")} className='rounded-[8px] px-3 py-2 text-xs font-medium text-[#111b21] transition hover:bg-[#e9edef]'>
                                Delete for everyone
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button onClick={() => setSelectedUser(null)} className='lg:hidden'>
                            <img src={assets.arrow_icon} alt="Back" className='w-6 rotate-180 opacity-60' />
                        </button>
                        <img src={selectedUser.profilePic || assets.avatar_icon} alt={selectedUser.name} className='h-10 w-10 rounded-full object-cover' />
                        <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium'>{selectedUser.name}</p>
                            <p className={`text-xs ${isSelectedUserOnline ? 'text-[#00a884]' : 'text-[#667781]'}`}>{isSelectedUserOnline ? 'Active now' : formatLastSeen(selectedUser.lastSeen)}</p>
                        </div>
                        <button onClick={() => setIsSelectionMode(true)} className='rounded-[8px] px-3 py-2 text-xs font-medium text-[#111b21] transition hover:bg-[#e9edef]'>
                            Select
                        </button>
                        <img src="/favicon.svg" alt="QuickChat" className='hidden h-8 w-8 rounded-full lg:block' />
                    </>
                )}
            </div>

            <div className='flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6'>
                {messages.map((msg) => {
                    const isOwnMessage = normalizeId(msg.senderId) === authUserId
                    const isSelected = selectedMessageIds.includes(normalizeId(msg._id))

                    return (
                        <div key={msg._id} className={`mb-3 flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            {isSelectionMode && !isOwnMessage && (
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${isSelected ? 'border-[#00a884] bg-[#00a884] text-white' : 'border-[#c7d0d6] bg-white text-transparent'}`}>
                                    x
                                </span>
                            )}
                            <div
                                ref={openMenuId === msg._id ? menuRef : null}
                                className={`relative max-w-[82%] sm:max-w-[70%] ${isSelectionMode ? 'cursor-pointer' : ''}`}
                                onClick={isSelectionMode ? () => toggleMessageSelection(msg._id) : undefined}
                            >
                                {isSelectionMode && isOwnMessage && (
                                    <span className={`absolute -left-7 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] ${isSelected ? 'border-[#00a884] bg-[#00a884] text-white' : 'border-[#c7d0d6] bg-white text-transparent'}`}>
                                        x
                                    </span>
                                )}
                                {isOwnMessage && !msg.pending && !isSelectionMode && (
                                    <button onClick={() => setOpenMenuId((prev) => prev === msg._id ? null : msg._id)} className='absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffffffcc] text-xs text-[#54656f] shadow-sm transition hover:bg-white' aria-label='Message options'>
                                        ...
                                    </button>
                                )}
                                {openMenuId === msg._id && !isSelectionMode && !msg.pending && (
                                    <div className='absolute right-2 top-9 z-20 min-w-[160px] rounded-[10px] border border-[#d1d7db] bg-white p-1.5 shadow-lg'>
                                        <button
                                            onClick={() => {
                                                deleteMessage(msg._id, "me")
                                                setOpenMenuId(null)
                                            }}
                                            className='w-full rounded-[8px] px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'
                                        >
                                            Delete for me
                                        </button>
                                        {isOwnMessage && (
                                            <button
                                                onClick={() => {
                                                    deleteMessage(msg._id, "everyone")
                                                    setOpenMenuId(null)
                                                }}
                                                className='w-full rounded-[8px] px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'
                                            >
                                                Delete for everyone
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsSelectionMode(true)
                                                setSelectedMessageIds([normalizeId(msg._id)])
                                                setOpenMenuId(null)
                                            }}
                                            className='w-full rounded-[8px] px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'
                                        >
                                            Select messages
                                        </button>
                                    </div>
                                )}
                                <div className={`min-w-0 rounded-[10px] px-3 py-1.5 ${isOwnMessage && !isSelectionMode ? 'pr-10' : ''} text-[13px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${isSelected ? 'ring-2 ring-[#00a884]/35' : ''} ${isOwnMessage ? 'rounded-tr-sm bg-[#d9fdd3] text-[#111b21]' : 'rounded-tl-sm bg-white text-[#111b21]'}`}>
                                    {!msg.isDeleted && msg.image && <img src={msg.image} alt="Shared media" className='mb-2 block h-auto max-h-72 w-[220px] max-w-full rounded-[8px] object-cover sm:w-[280px]' />}
                                    {msg.isDeleted ? (
                                        <p className='italic text-[#667781]'>This message was deleted</p>
                                    ) : (
                                        msg.text && <p className='break-words whitespace-pre-wrap leading-6'>{msg.text}</p>
                                    )}
                                    <div className='mt-1 flex items-center justify-end gap-2 text-[11px] text-[#667781]'>
                                        <span>{formatMessageTime(msg.createdAt)}</span>
                                        {isOwnMessage && <span>{msg.pending ? 'Sending' : msg.seen ? 'Seen' : 'Sent'}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={scrollEnd}></div>
            </div>

            <div className='border-t border-[#d1d7db] bg-[#f0f2f5] p-3'>
                <div className='flex items-center gap-3'>
                    <div className='flex flex-1 items-center rounded-[10px] bg-white px-4'>
                        <input onChange={handleSendImage} type="file" id="image" accept='image/png, image/jpeg, image/jpg' hidden />
                        <label htmlFor="image">
                            <img src={assets.gallery_icon} alt="" className='mr-3 w-5 cursor-pointer opacity-100 [filter:brightness(0)_saturate(100%)_invert(38%)_sepia(10%)_saturate(613%)_hue-rotate(153deg)_brightness(91%)_contrast(92%)]' />
                        </label>
                        <input onChange={(e) => setInput(e.target.value)} value={input} onKeyDown={(e) => e.key === "Enter" ? handleSendMessage(e) : null} type="text" placeholder='Type a message' className='flex-1 bg-transparent py-3 text-[13px] text-[#111b21] outline-none placeholder:text-[#667781]' />
                    </div>
                    <button onClick={handleSendMessage} className='flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-xl font-semibold text-white transition hover:bg-[#00926f]' aria-label='Send message'>
                        <span className='-translate-y-[1px] translate-x-[1px]'>&#10148;</span>
                    </button>
                </div>
            </div>
        </div>
    ) : (
        <div className='hidden min-h-0 flex-col items-center justify-center gap-4 bg-[#f8f9fa] text-center lg:flex'>
            <div className='flex items-center gap-3 rounded-[14px] border border-[#d1d7db] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(11,20,26,0.06)]'>
                <img src="/favicon.svg" alt="QuickChat" className='h-12 w-12 rounded-full' />
                <div className='text-left'>
                    <p className='text-sm font-semibold text-[#111b21]'>QuickChat</p>
                    <p className='text-xs text-[#667781]'>Private messaging for desktop</p>
                </div>
            </div>
            <div className='space-y-2'>
                <p className='text-3xl font-semibold text-[#41525d]'>QuickChat for desktop</p>
                <p className='max-w-md text-sm leading-6 text-[#667781]'>Send and receive messages without keeping your phone online. Use QuickChat on up to 4 linked devices.</p>
            </div>
        </div>
    )
}

export default ChatContainer
