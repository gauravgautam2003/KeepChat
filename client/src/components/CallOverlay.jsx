import { FiMic, FiMicOff, FiPhoneIncoming, FiPhoneOff, FiVideo, FiVideoOff, FiX } from 'react-icons/fi'
import assets from '../assets/assets'
import { formatPhoneNumber } from '../lib/utils'

const getCallStatusText = (session) => {
    if (session.phase === "incoming") {
        return session.type === "video" ? "Incoming video call" : "Incoming voice call"
    }

    if (session.phase === "calling") {
        return session.type === "video" ? "Calling..." : "Ringing..."
    }

    if (session.phase === "connecting") {
        return "Connecting..."
    }

    if (session.phase === "active") {
        return session.type === "video" ? "Video call live" : "Voice call live"
    }

    return ""
}

const CallOverlay = ({
    session,
    localVideoRef,
    remoteVideoRef,
    isMicMuted,
    isCameraOff,
    onAccept,
    onReject,
    onEnd,
    onToggleMic,
    onToggleCamera,
}) => {
    if (session.phase === "idle" || !session.partner) return null

    const isVideoCall = session.type === "video"
    const isIncoming = session.phase === "incoming"

    if (isIncoming) {
        return (
            <div className='fixed inset-0 z-[120] flex items-center justify-center bg-[#0b141a]/42 backdrop-blur-[2px]'>
                <div className='h-auto w-[420px] rounded-xl  border border-white/10 bg-[#111b21] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]'>
                    <div className='space-y-5 text-center'>
                        <div className='mx-auto inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[#9fb3c8]'>
                            KeepChat
                        </div>
                        <img
                            src={session.partner.profilePic || assets.avatar_icon}
                            alt={session.partner.name}
                            className='mx-auto h-24 w-24 rounded-full border-4 border-white/10 object-cover shadow-lg'
                        />
                        <div className='space-y-1.5'>
                            <h2 className='text-2xl font-semibold'>{session.partner.name}</h2>
                            <p className='text-sm text-[#d1d7db]'>{getCallStatusText(session)}</p>
                            <p className='text-xs text-[#8ba1b2]'>📱 {formatPhoneNumber(session.partner.phone)}</p>
                        </div>
                        <div className='rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-[#d1d7db]'>
                            As soon as you allow browser permission, the call will connect.
                        </div>
                        <div className='grid grid-cols-2 gap-3 pt-1'>
                            <button
                                type="button"
                                onClick={onReject}
                                className='flex items-center justify-center gap-2 rounded-full bg-[#f15c6d] px-5 py-3 text-sm font-medium transition hover:bg-[#db4d5f]'
                                aria-label='Decline call'
                            >
                                <FiPhoneOff className='text-lg' />
                                Decline
                            </button>
                            <button
                                type="button"
                                onClick={onAccept}
                                className='flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-semibold text-[#072a17] transition hover:bg-[#1fb75b]'
                                aria-label='Accept call'
                            >
                                <FiPhoneIncoming className='text-lg' />
                                Receive
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='fixed inset-0 z-[120] flex items-center justify-center bg-[#0b141a]/58 backdrop-blur-sm'>
            <div className='relative flex h-screen w-screen flex-col overflow-hidden  border border-white/10 bg-[#111b21] text-white shadow-[0_30px_90px_rgba(0,0,0,0.46)]'>
                <button
                    type="button"
                    onClick={onEnd}
                    className='absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center  text-lg transition-all'
                    aria-label='Close call panel'
                >
                    <FiX />
                </button>

                <div className='grid flex-1 min-h-0 '>
                    {/* <div className='flex flex-col justify-between gap-6 border-white/10 bg-[radial-gradient(circle_at_top,_rgba(37,211,102,0.18),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-6 sm:p-8 lg:border-b-0 lg:border-r'>
                        <div className='space-y-4'>
                            <div className='inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#9fb3c8]'>
                                KeepChat Call
                            </div>
                            <div className='flex items-center gap-4'>
                                <img
                                    src={session.partner.profilePic || assets.avatar_icon}
                                    alt={session.partner.name}
                                    className='h-20 w-20 rounded-full border-2 border-white/10 object-cover shadow-lg'
                                />
                                <div className='min-w-0'>
                                    <h2 className='truncate text-sm font-semibold'>{session.partner.name}</h2>
                                    <p className='mt-1 text-xs text-[#d1d7db]'>{getCallStatusText(session)}</p>
                                    <p className='mt-1 text-xs text-[#8ba1b2]'>📱 {formatPhoneNumber(session.partner.phone)}</p>
                                </div>
                            </div>
                            <p className='rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-[#d1d7db]'>
                                Real-time calling is running on WebRTC, so both users need to stay online.
                            </p>
                        </div>

                        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
                            <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <p className='text-xs uppercase tracking-[0.24em] text-[#8ba1b2]'>Mode</p>
                                <p className='mt-2 text-xs font-medium'>{isVideoCall ? "🎥 Video call" : "📞 Voice call"}</p>
                            </div>
                            <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <p className='text-xs uppercase tracking-[0.24em] text-[#8ba1b2]'>Status</p>
                                <p className='mt-2 text-xs font-medium'>{session.hasRemoteStream ? "Connected" : "Waiting for other side"}</p>
                            </div>
                        </div>
                    </div> */}

                    <div className='relative flex min-h-0 flex-1 flex-col bg-[#0b141a] p-4 sm:p-6 lg:p-8'>
                        <div className='relative flex-1 overflow-hidden rounded-lg border border-white/10 bg-[#1f2c34]'>
                            {isVideoCall ? (
                                <>
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        className={`h-full w-full object-cover ${session.hasRemoteStream ? "block" : "hidden"}`}
                                    />
                                    {!session.hasRemoteStream && (
                                        <div className='flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle,_rgba(37,211,102,0.2),_transparent_45%)] px-6 text-center'>
                                            <img src={session.partner.profilePic || assets.avatar_icon} alt={session.partner.name} className='h-28 w-28 rounded-full object-cover shadow-xl' />
                                            <div>
                                                <p className='text-sm font-semibold'>{session.partner.name}</p>
                                                <p className='mt-1 text-sm text-[#d1d7db]'>Waiting for camera to connect...</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className='flex h-full flex-col items-center justify-center gap-5 bg-[radial-gradient(circle,_rgba(37,211,102,0.16),_transparent_42%)] px-6 text-center'>
                                    <video ref={remoteVideoRef} autoPlay playsInline className='hidden' />
                                    <img src={session.partner.profilePic || assets.avatar_icon} alt={session.partner.name} className='h-36 w-36 rounded-full object-cover shadow-xl' />
                                    <div>
                                        <p className='text-xl font-semibold'>{session.partner.name}</p>
                                        <p className='mt-2 text-xs text-[#d1d7db]'>{session.hasRemoteStream ? "🔊 Voice connected" : "📶 Waiting for connection..."}</p>
                                    </div>
                                </div>
                            )}

                            <div className='absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-lg border border-white/10 bg-[#202c33] shadow-lg sm:h-40 sm:w-28'>
                                {isVideoCall && !isCameraOff ? (
                                    <video ref={localVideoRef} autoPlay playsInline muted className='h-full w-full object-cover' />
                                ) : (
                                    <div className='flex h-full flex-col items-center justify-center gap-2 text-[#d1d7db]'>
                                        <img src={assets.avatar_icon} alt="You" className='h-12 w-12 rounded-full object-cover opacity-90' />
                                        <p className='text-[11px]'>{isVideoCall ? "Camera off" : "You"}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='mt-5 flex flex-wrap items-center justify-center gap-3'>
                            <button
                                type="button"
                                onClick={onToggleMic}
                                className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition ${isMicMuted ? "bg-[#f15c6d]" : "bg-white/10 hover:bg-white/15"}`}
                                aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                            >
                                {isMicMuted ? <FiMicOff /> : <FiMic />}
                            </button>
                            {isVideoCall && (
                                <button
                                    type="button"
                                    onClick={onToggleCamera}
                                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition ${isCameraOff ? "bg-[#f0b429] text-[#111b21]" : "bg-white/10 hover:bg-white/15"}`}
                                    aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                                >
                                    {isCameraOff ? <FiVideoOff /> : <FiVideo />}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onEnd}
                                className='flex h-12 w-12 items-center justify-center rounded-full bg-[#f15c6d] text-xl transition hover:bg-[#db4d5f]'
                                aria-label='End call'
                            >
                                <FiPhoneOff />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CallOverlay
