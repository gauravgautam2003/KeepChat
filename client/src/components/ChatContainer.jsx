'use client'

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { BsCheck2, BsCheck2All } from 'react-icons/bs'
import { FiArrowLeft, FiCheck, FiCheckCircle, FiCircle, FiImage, FiMoreVertical, FiPhone, FiSend, FiTrash2, FiVideo } from 'react-icons/fi'
import assets from '../assets/assets'
import CallOverlay from './CallOverlay'
import { formatLastSeen, formatMessageTime } from '../lib/utils'
import { ChatContext } from '../context/ChatContext'
import { AuthContext } from '../context/AuthContext'

const normalizeId = (value) => {
    if (!value) return ""
    if (typeof value === "string") return value
    if (typeof value === "object" && value._id) return normalizeId(value._id)
    return value.toString?.() || ""
}

const getInitialCallSession = () => ({
    phase: "idle",
    direction: null,
    type: "audio",
    partner: null,
    offer: null,
    hasRemoteStream: false,
})

const getMessageStatusIcon = (message) => {
    if (message.pending) {
        return <span title='Sending'>⏳</span>
    }

    if (message.seen) {
        return <BsCheck2All className='text-[#53bdeb]' title='Seen' />
    }

    return <BsCheck2 title='Sent' />
}

const ChatContainer = () => {
    const { messages, users = [], selectedUser, setSelectedUser, sendMessage, getMessages, deleteMessage } = useContext(ChatContext)
    const { authUser, onlineUsers = [], socket } = useContext(AuthContext)
    const scrollEnd = useRef(null)
    const menuRef = useRef(null)
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const peerConnectionRef = useRef(null)
    const localStreamRef = useRef(null)
    const remoteStreamRef = useRef(null)
    const pendingIceCandidatesRef = useRef([])
    const callSessionRef = useRef(getInitialCallSession())
    const usersRef = useRef(users)
    const ringtoneIntervalRef = useRef(null)
    const ringtoneAudioContextRef = useRef(null)
    const [input, setInput] = useState("")
    const [openMenuId, setOpenMenuId] = useState(null)
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedMessageIds, setSelectedMessageIds] = useState([])
    const [callSession, setCallSession] = useState(getInitialCallSession)
    const [isMicMuted, setIsMicMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(false)
    const selectedUserId = normalizeId(selectedUser?._id)
    const authUserId = normalizeId(authUser?._id)
    const isSelectedUserOnline = onlineUsers.some((userId) => normalizeId(userId) === selectedUserId)
    const selectedMessages = messages.filter((msg) => selectedMessageIds.includes(normalizeId(msg._id)))
    const canDeleteSelectedForEveryone = selectedMessages.length > 0 && selectedMessages.every((msg) => normalizeId(msg.senderId) === authUserId)

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

    const syncVideoElements = useCallback(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current || null
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current || null
        }
    }, [])

    const teardownCallResources = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.ontrack = null
            peerConnectionRef.current.onicecandidate = null
            peerConnectionRef.current.onconnectionstatechange = null
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
            localStreamRef.current = null
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach((track) => track.stop())
            remoteStreamRef.current = null
        }

        pendingIceCandidatesRef.current = []
        syncVideoElements()
    }, [syncVideoElements])

    const stopRingtone = useCallback(() => {
        if (ringtoneIntervalRef.current) {
            clearInterval(ringtoneIntervalRef.current)
            ringtoneIntervalRef.current = null
        }

        if (ringtoneAudioContextRef.current && ringtoneAudioContextRef.current.state === "running") {
            ringtoneAudioContextRef.current.suspend().catch(() => { })
        }
    }, [])

    const playRingtoneBurst = useCallback(() => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext
            if (!AudioContextClass) return

            if (!ringtoneAudioContextRef.current) {
                ringtoneAudioContextRef.current = new AudioContextClass()
            }

            const ctx = ringtoneAudioContextRef.current
            if (ctx.state === "suspended") {
                ctx.resume().catch(() => { })
            }

            const gain = ctx.createGain()
            gain.gain.value = 0.035
            gain.connect(ctx.destination)

                ;[0, 0.32].forEach((offset, index) => {
                    const oscillator = ctx.createOscillator()
                    oscillator.type = index === 0 ? "sine" : "triangle"
                    oscillator.frequency.setValueAtTime(index === 0 ? 740 : 620, ctx.currentTime + offset)
                    oscillator.connect(gain)
                    oscillator.start(ctx.currentTime + offset)
                    oscillator.stop(ctx.currentTime + offset + 0.18)
                })
        } catch (error) {
            console.log("Ringtone playback unavailable", error.message)
        }
    }, [])

    const startRingtone = useCallback(() => {
        stopRingtone()
        playRingtoneBurst()
        ringtoneIntervalRef.current = setInterval(() => {
            playRingtoneBurst()
        }, 1600)
    }, [playRingtoneBurst, stopRingtone])

    const resetCallState = useCallback(() => {
        stopRingtone()
        teardownCallResources()
        setCallSession(getInitialCallSession())
        setIsMicMuted(false)
        setIsCameraOff(false)
    }, [stopRingtone, teardownCallResources])

    const flushPendingIceCandidates = useCallback(async () => {
        const connection = peerConnectionRef.current
        if (!connection?.remoteDescription) return

        while (pendingIceCandidatesRef.current.length) {
            const candidate = pendingIceCandidatesRef.current.shift()
            if (!candidate) continue

            try {
                await connection.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
                console.log("Error applying ICE candidate", error.message)
            }
        }
    }, [])

    const createPeerConnection = useCallback((partnerId) => {
        const connection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        })

        remoteStreamRef.current = new MediaStream()
        syncVideoElements()

        connection.ontrack = (event) => {
            event.streams.forEach((stream) => {
                stream.getTracks().forEach((track) => {
                    const alreadyExists = remoteStreamRef.current.getTracks().some((existingTrack) => existingTrack.id === track.id)
                    if (!alreadyExists) {
                        remoteStreamRef.current.addTrack(track)
                    }
                })
            })

            setCallSession((prev) => ({
                ...prev,
                phase: "active",
                hasRemoteStream: true,
            }))
            syncVideoElements()
        }

        connection.onicecandidate = (event) => {
            if (event.candidate && socket && partnerId) {
                socket.emit("call:ice-candidate", {
                    to: partnerId,
                    candidate: event.candidate,
                })
            }
        }

        connection.onconnectionstatechange = () => {
            if (connection.connectionState === "connected") {
                setCallSession((prev) => ({
                    ...prev,
                    phase: "active",
                }))
            }

            if (["failed", "closed"].includes(connection.connectionState)) {
                toast.error("Call connection ended")
                resetCallState()
            }
        }

        peerConnectionRef.current = connection
        return connection
    }, [resetCallState, socket, syncVideoElements])

    const prepareLocalStream = useCallback(async (callType) => {
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
            throw new Error("Your browser does not support calling")
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === "video" ? { facingMode: "user" } : false,
        })

        localStreamRef.current = stream
        setIsMicMuted(false)
        setIsCameraOff(callType !== "video")
        syncVideoElements()
        return stream
    }, [syncVideoElements])

    const addLocalTracksToConnection = useCallback((connection, stream) => {
        stream.getTracks().forEach((track) => {
            connection.addTrack(track, stream)
        })
    }, [])

    const endCall = useCallback((notifyRemote = true) => {
        const partnerId = normalizeId(callSessionRef.current.partner?._id)
        if (notifyRemote && partnerId && socket) {
            socket.emit("call:end", { to: partnerId })
        }

        resetCallState()
    }, [resetCallState, socket])

    const rejectIncomingCall = useCallback((reason = "rejected") => {
        const partnerId = normalizeId(callSessionRef.current.partner?._id)
        if (partnerId && socket) {
            socket.emit("call:reject", { to: partnerId, reason })
        }

        resetCallState()
    }, [resetCallState, socket])

    const startCall = useCallback(async (callType) => {
        if (!selectedUser?._id || !socket) return

        if (callSessionRef.current.phase !== "idle") {
            toast.error("Finish the current call first")
            return
        }

        if (!isSelectedUserOnline) {
            toast.error("User is offline right now")
            return
        }

        try {
            const stream = await prepareLocalStream(callType)
            const connection = createPeerConnection(selectedUser._id)
            addLocalTracksToConnection(connection, stream)

            const offer = await connection.createOffer()
            await connection.setLocalDescription(offer)

            setCallSession({
                phase: "calling",
                direction: "outgoing",
                type: callType,
                partner: selectedUser,
                offer: null,
                hasRemoteStream: false,
            })

            socket.emit("call:offer", {
                to: selectedUserId,
                offer,
                callType,
                caller: {
                    _id: authUser?._id,
                    name: authUser?.name,
                    profilePic: authUser?.profilePic || "",
                    phone: authUser?.phone || "",
                },
            })
        } catch (error) {
            resetCallState()
            toast.error(error.message || "Unable to start call")
        }
    }, [addLocalTracksToConnection, authUser?._id, authUser?.name, authUser?.phone, authUser?.profilePic, createPeerConnection, isSelectedUserOnline, prepareLocalStream, resetCallState, selectedUser, selectedUserId, socket])

    const acceptIncomingCall = useCallback(async () => {
        const activeCall = callSessionRef.current
        if (!activeCall.partner?._id || !activeCall.offer || !socket) return

        try {
            stopRingtone()
            const matchedUser = usersRef.current.find((user) => normalizeId(user._id) === normalizeId(activeCall.partner._id))
            if (matchedUser) {
                setSelectedUser(matchedUser)
            }

            const stream = await prepareLocalStream(activeCall.type)
            const connection = createPeerConnection(activeCall.partner._id)
            addLocalTracksToConnection(connection, stream)
            await connection.setRemoteDescription(new RTCSessionDescription(activeCall.offer))
            await flushPendingIceCandidates()

            const answer = await connection.createAnswer()
            await connection.setLocalDescription(answer)

            setCallSession((prev) => ({
                ...prev,
                phase: "connecting",
            }))

            socket.emit("call:answer", {
                to: normalizeId(activeCall.partner._id),
                answer,
            })
        } catch (error) {
            resetCallState()
            toast.error(error.message || "Unable to accept call")
        }
    }, [addLocalTracksToConnection, createPeerConnection, flushPendingIceCandidates, prepareLocalStream, resetCallState, setSelectedUser, socket, stopRingtone])

    const toggleMicrophone = useCallback(() => {
        const audioTracks = localStreamRef.current?.getAudioTracks() || []
        if (!audioTracks.length) return

        const nextMutedState = !isMicMuted
        audioTracks.forEach((track) => {
            track.enabled = !nextMutedState
        })
        setIsMicMuted(nextMutedState)
    }, [isMicMuted])

    const toggleCamera = useCallback(() => {
        const videoTracks = localStreamRef.current?.getVideoTracks() || []
        if (!videoTracks.length) return

        const nextCameraState = !isCameraOff
        videoTracks.forEach((track) => {
            track.enabled = !nextCameraState
        })
        setIsCameraOff(nextCameraState)
    }, [isCameraOff])

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

    useEffect(() => {
        callSessionRef.current = callSession
    }, [callSession])

    useEffect(() => {
        usersRef.current = users
    }, [users])

    useEffect(() => {
        syncVideoElements()
    }, [callSession.hasRemoteStream, callSession.phase, syncVideoElements])

    useEffect(() => {
        if (!socket) return undefined

        const handleIncomingCall = ({ from, offer, callType, caller }) => {
            if (callSessionRef.current.phase !== "idle") {
                socket.emit("call:reject", { to: from, reason: "busy" })
                return
            }

            const matchedUser = usersRef.current.find((user) => normalizeId(user._id) === normalizeId(from))
            const partner = {
                ...(matchedUser || caller || {}),
                _id: matchedUser?._id || caller?._id || from,
                name: matchedUser?.name || caller?.name || "QuickChat user",
                profilePic: matchedUser?.profilePic || caller?.profilePic || "",
                phone: matchedUser?.phone || caller?.phone || "",
            }

            if (matchedUser) {
                setSelectedUser(matchedUser)
            }

            startRingtone()
            setCallSession({
                phase: "incoming",
                direction: "incoming",
                type: callType === "video" ? "video" : "audio",
                partner,
                offer,
                hasRemoteStream: false,
            })

            toast(`${callType === "video" ? "🎥" : "📞"} ${partner.name} is calling`)
        }

        const handleAnsweredCall = async ({ from, answer }) => {
            if (normalizeId(callSessionRef.current.partner?._id) !== normalizeId(from) || !peerConnectionRef.current) {
                return
            }

            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
            await flushPendingIceCandidates()
            setCallSession((prev) => ({
                ...prev,
                phase: "connecting",
            }))
        }

        const handleIceCandidate = async ({ from, candidate }) => {
            if (normalizeId(callSessionRef.current.partner?._id) !== normalizeId(from) || !candidate || !peerConnectionRef.current) {
                return
            }

            if (peerConnectionRef.current.remoteDescription) {
                try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (error) {
                    console.log("Error adding remote ICE candidate", error.message)
                }
            } else {
                pendingIceCandidatesRef.current.push(candidate)
            }
        }

        const handleRejectedCall = ({ from, reason }) => {
            if (normalizeId(callSessionRef.current.partner?._id) !== normalizeId(from)) {
                return
            }

            toast.error(reason === "busy" ? "User is busy on another call" : "Call was declined")
            resetCallState()
        }

        const handleEndedCall = ({ from }) => {
            if (normalizeId(callSessionRef.current.partner?._id) !== normalizeId(from)) {
                return
            }

            toast("Call ended")
            resetCallState()
        }

        socket.on("call:incoming", handleIncomingCall)
        socket.on("call:answered", handleAnsweredCall)
        socket.on("call:ice-candidate", handleIceCandidate)
        socket.on("call:rejected", handleRejectedCall)
        socket.on("call:ended", handleEndedCall)

        return () => {
            socket.off("call:incoming", handleIncomingCall)
            socket.off("call:answered", handleAnsweredCall)
            socket.off("call:ice-candidate", handleIceCandidate)
            socket.off("call:rejected", handleRejectedCall)
            socket.off("call:ended", handleEndedCall)
        }
    }, [flushPendingIceCandidates, resetCallState, setSelectedUser, socket, startRingtone, syncVideoElements])

    useEffect(() => () => {
        stopRingtone()
        teardownCallResources()
    }, [stopRingtone, teardownCallResources])

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

    const renderSelectionToggle = (messageId, isSelected) => (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation()
                toggleMessageSelection(messageId)
            }}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm transition ${isSelected ? "border-[#00a884] bg-[#00a884] text-white" : "border-[#c7d0d6] bg-white text-[#c7d0d6]"}`}
            aria-label={isSelected ? 'Unselect message' : 'Select message'}
        >
            {isSelected ? <FiCheck /> : <FiCircle className='text-[10px]' />}
        </button>
    )

    return (
        <>
            {selectedUser ? (
                <div className='wa-chat-panel relative flex min-h-0 min-w-0 flex-col overflow-hidden'>
                    <div className='flex items-center gap-3 border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-3 text-[#111b21]'>
                        {isSelectionMode ? (
                            <>
                                <button type="button" onClick={resetSelection} className='rounded-full p-2 transition hover:bg-[#e9edef]' aria-label='Exit selection mode'>
                                    <FiArrowLeft className='text-lg text-[#54656f]' />
                                </button>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-medium'>🧹 {selectedMessageIds.length} selected</p>
                                    <p className='text-xs text-[#667781]'>Messages from both left and right sides can be selected.</p>
                                </div>
                                <button type="button" onClick={() => handleBulkDelete("me")} className='rounded-full p-2 text-[#54656f] transition hover:bg-[#e9edef]' title='Delete for me' aria-label='Delete selected messages for me'>
                                    <FiTrash2 className='text-lg' />
                                </button>
                                {canDeleteSelectedForEveryone && (
                                    <button type="button" onClick={() => handleBulkDelete("everyone")} className='rounded-full p-2 text-[#c65353] transition hover:bg-[#ffe7e7]' title='Delete for everyone' aria-label='Delete selected messages for everyone'>
                                        <FiTrash2 className='text-lg' />
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => setSelectedUser(null)} className='rounded-full p-2 transition hover:bg-[#e9edef] lg:hidden' aria-label='Back to chats'>
                                    <FiArrowLeft className='text-lg text-[#54656f]' />
                                </button>
                                <img src={selectedUser.profilePic || assets.avatar_icon} alt={selectedUser.name} className='h-10 w-10 rounded-full object-cover' />
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-medium'>{selectedUser.name}</p>
                                    <p className={`text-xs ${isSelectedUserOnline ? 'text-[#00a884]' : 'text-[#667781]'}`}>{isSelectedUserOnline ? '🟢 Active now' : formatLastSeen(selectedUser.lastSeen)}</p>
                                </div>
                                <button type="button" onClick={() => startCall("audio")} disabled={!isSelectedUserOnline} className='rounded-full  text-[#54656f] transition hover:bg-[#e9edef] disabled:cursor-not-allowed disabled:opacity-45' title='Voice call' aria-label='Start voice call'>
                                    <FiPhone className='text-lg' />
                                </button>
                                <button type="button" onClick={() => startCall("video")} disabled={!isSelectedUserOnline} className='rounded-full  text-[#54656f] transition hover:bg-[#e9edef] disabled:cursor-not-allowed disabled:opacity-45' title='Video call' aria-label='Start video call'>
                                    <FiVideo className='text-lg' />
                                </button>
                                <button type="button" onClick={() => setIsSelectionMode(true)} className='rounded-full text-[#54656f] transition hover:bg-[#e9edef]' title='Select messages' aria-label='Select messages'>
                                    <FiCheckCircle className='text-lg' />
                                </button>
                            </>
                        )}
                    </div>

                    <div className='flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-6'>
                        {messages.map((msg) => {
                            const normalizedMessageId = normalizeId(msg._id)
                            const isOwnMessage = normalizeId(msg.senderId) === authUserId
                            const isSelected = selectedMessageIds.includes(normalizedMessageId)

                            return (
                                <div key={msg._id} className={`mb-3 flex w-full items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`} onClick={isSelectionMode ? () => toggleMessageSelection(msg._id) : undefined}>
                                    {isSelectionMode && !isOwnMessage && renderSelectionToggle(msg._id, isSelected)}
                                    <div ref={openMenuId === msg._id ? menuRef : null} className={`relative max-w-[86%] sm:max-w-[72%] ${isSelectionMode ? 'cursor-pointer' : ''}`}>
                                        {isOwnMessage && !msg.pending && !isSelectionMode && (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    setOpenMenuId((prev) => prev === msg._id ? null : msg._id)
                                                }}
                                                className='absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#ffffffcc] text-[#54656f] shadow-sm transition hover:bg-white'
                                                aria-label='Message options'
                                            >
                                                <FiMoreVertical />
                                            </button>
                                        )}
                                        {openMenuId === msg._id && !isSelectionMode && !msg.pending && (
                                            <div className='absolute right-2 top-10 z-20 min-w-[170px] rounded-[12px] border border-[#d1d7db] bg-white p-1.5 shadow-lg'>
                                                <button type="button" onClick={() => { deleteMessage(msg._id, "me"); setOpenMenuId(null) }} className='flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'>
                                                    <FiTrash2 />
                                                    Delete for me
                                                </button>
                                                {isOwnMessage && (
                                                    <button type="button" onClick={() => { deleteMessage(msg._id, "everyone"); setOpenMenuId(null) }} className='flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'>
                                                        <FiTrash2 />
                                                        Delete for everyone
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => { setIsSelectionMode(true); setSelectedMessageIds([normalizedMessageId]); setOpenMenuId(null) }} className='flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f5f6f6]'>
                                                    <FiCheckCircle />
                                                    Select messages
                                                </button>
                                            </div>
                                        )}
                                        <div className={`min-w-0 rounded-[10px] px-3 py-1.5 ${isOwnMessage && !isSelectionMode ? 'pr-11' : ''} text-[13px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${isSelected ? 'ring-2 ring-[#00a884]/35' : ''} ${isOwnMessage ? 'rounded-tr-sm bg-[#d9fdd3] text-[#111b21]' : 'rounded-tl-sm bg-white text-[#111b21]'}`}>
                                            {!msg.isDeleted && msg.image && <img src={msg.image} alt="Shared media" className='mb-2 block h-auto max-h-72 w-[220px] max-w-full rounded-[8px] object-cover sm:w-[280px]' />}
                                            {msg.isDeleted ? (
                                                <p className='italic text-[#667781]'>🚫 This message was deleted</p>
                                            ) : (
                                                msg.text && <p className='break-words whitespace-pre-wrap leading-6'>{msg.text}</p>
                                            )}
                                            <div className='mt-1 flex items-center justify-end gap-1.5 text-[11px] text-[#667781]'>
                                                <span>{formatMessageTime(msg.createdAt)}</span>
                                                {isOwnMessage && <span className='flex items-center text-[13px]'>{getMessageStatusIcon(msg)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelectionMode && isOwnMessage && renderSelectionToggle(msg._id, isSelected)}
                                </div>
                            )
                        })}
                        <div ref={scrollEnd}></div>
                    </div>

                    <div className='border-t border-[#d1d7db] bg-[#f0f2f5] p-3'>
                        <div className='flex items-center gap-3'>
                            <div className='flex flex-1 items-center rounded-[10px] bg-white px-4'>
                                <input onChange={handleSendImage} type="file" id="image" accept='image/png, image/jpeg, image/jpg' hidden />
                                <label htmlFor="image" className='mr-3 cursor-pointer rounded-full p-1.5 text-[#54656f] transition hover:bg-[#f0f2f5]' aria-label='Send image'>
                                    <FiImage className='text-lg' />
                                </label>
                                <input onChange={(e) => setInput(e.target.value)} value={input} onKeyDown={(e) => e.key === "Enter" ? handleSendMessage(e) : null} type="text" placeholder='Send message...' className='flex-1 bg-transparent py-3 text-[13px] text-[#111b21] outline-none placeholder:text-[#667781]' />
                            </div>
                            <button type="button" onClick={handleSendMessage} className='flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] font-bold text-lg text-white transition hover:bg-[#00926f]' aria-label='Send message'>
                                <FiSend />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='hidden min-h-0 flex-col items-center justify-center gap-4 bg-[#f8f9fa] px-6 text-center lg:flex'>
                    <div className='flex items-center gap-3 rounded-[14px] border border-[#d1d7db] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(11,20,26,0.06)]'>
                        <img src="/favicon.svg" alt="QuickChat" className='h-12 w-12 rounded-full' />
                        <div className='text-left'>
                            <p className='text-sm font-semibold text-[#111b21]'>KeepChat</p>
                            <p className='text-xs text-[#667781]'>Private messaging for desktop</p>
                        </div>
                    </div>
                    <div className='space-y-2'>
                        <p className='text-3xl font-semibold text-[#41525d]'>KeepChat for desktop</p>
                        <p className='max-w-md text-sm leading-6 text-[#667781]'>Chat, share images, select-delete messages, and start audio/video calls with online users.</p>
                    </div>
                </div>
            )}

            <CallOverlay
                session={callSession}
                localVideoRef={localVideoRef}
                remoteVideoRef={remoteVideoRef}
                isMicMuted={isMicMuted}
                isCameraOff={isCameraOff}
                onAccept={acceptIncomingCall}
                onReject={() => rejectIncomingCall("rejected")}
                onEnd={() => endCall(true)}
                onToggleMic={toggleMicrophone}
                onToggleCamera={toggleCamera}
            />
        </>
    )
}

export default ChatContainer
