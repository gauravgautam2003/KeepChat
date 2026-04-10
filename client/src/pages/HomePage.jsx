import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import RightSidebar from '../components/RightSidebar'
import ChatContainer from '../components/ChatContainer'
import { ChatContext } from '../context/ChatContext'
import { AuthContext } from '../context/AuthContext'
import { userDummyData } from '../assets/assets'

const VISITOR_PREVIEW_STORAGE_KEY = "keepchat-visitor-preview-open";

const HomePage = () => {
    const navigate = useNavigate();
    const { authUser } = useContext(AuthContext);
    const { selectedUser, isRightSidebarOpen, users = [] } = useContext(ChatContext);
    const [hasOpenedPreview, setHasOpenedPreview] = useState(() => sessionStorage.getItem(VISITOR_PREVIEW_STORAGE_KEY) === "true");
    const previewHighlights = useMemo(() => (users.length ? users : userDummyData).slice(0, 3), [users]);

    const openPreviewExperience = () => {
        sessionStorage.setItem(VISITOR_PREVIEW_STORAGE_KEY, "true");
        setHasOpenedPreview(true);
    };

    if (!authUser && !hasOpenedPreview) {
        return (
            <div className='screen-shell overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(0,168,132,0.22),_transparent_28%),linear-gradient(160deg,_#f7fbf9_0%,_#eef4f1_45%,_#dfe9e4_100%)] px-4 py-6 sm:px-6 lg:px-10 lg:py-8'>
                <div className='mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(17,27,33,0.14)] backdrop-blur'>
                    <div className='grid flex-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]'>
                        <div className='flex flex-col justify-between border-b border-[#dfe5e7] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10 xl:p-12'>
                            <div className='space-y-8'>
                                <div className='flex items-center gap-3'>
                                    <img src="/favicon.svg" alt="KeepChat" className='h-12 w-12 rounded-2xl border border-[#dfe5e7] bg-white p-2 shadow-sm' />
                                    <div>
                                        <p className='text-sm font-semibold uppercase tracking-[0.22em] text-[#00a884]'>KeepChat</p>
                                        <p className='text-sm text-[#667781]'>A calm, private messaging space for real conversations.</p>
                                    </div>
                                </div>

                                <div className='space-y-5'>
                                    <span className='inline-flex rounded-full border border-[#b6e4d7] bg-[#ecfff7] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#00795f]'>
                                        Visitor preview
                                    </span>
                                    <h1 className='max-w-2xl text-4xl font-semibold leading-tight text-[#111b21] sm:text-5xl'>
                                        Explore the chat experience first, create an account when you are ready.
                                    </h1>
                                    <p className='max-w-2xl text-base leading-8 text-[#41525d] sm:text-lg'>
                                        KeepChat is made for people who want a simple private place to talk with friends, teammates, or close contacts.
                                        You can preview the interface right now, open conversations, and understand the product before signing in.
                                    </p>
                                </div>

                                <div className='grid gap-4 sm:grid-cols-3'>
                                    <div className='rounded-[22px] border border-[#dfe5e7] bg-[#f8fbfa] p-5'>
                                        <p className='text-sm font-semibold text-[#111b21]'>See the layout</p>
                                        <p className='mt-2 text-sm leading-6 text-[#667781]'>Browse chat lists, open conversations, and inspect the interface comfortably.</p>
                                    </div>
                                    <div className='rounded-[22px] border border-[#dfe5e7] bg-[#f8fbfa] p-5'>
                                        <p className='text-sm font-semibold text-[#111b21]'>Read without pressure</p>
                                        <p className='mt-2 text-sm leading-6 text-[#667781]'>No sign-in wall up front, so visitors can understand what the website is for first.</p>
                                    </div>
                                    <div className='rounded-[22px] border border-[#dfe5e7] bg-[#f8fbfa] p-5'>
                                        <p className='text-sm font-semibold text-[#111b21]'>Unlock messaging later</p>
                                        <p className='mt-2 text-sm leading-6 text-[#667781]'>If you try to message in preview mode, KeepChat will ask you to create your account.</p>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-10 flex flex-col gap-3 sm:flex-row'>
                                <button type="button" onClick={openPreviewExperience} className='rounded-[16px] bg-[#00a884] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(0,168,132,0.22)] transition hover:bg-[#008f70]'>
                                    Continue to preview
                                </button>
                                <button type="button" onClick={() => navigate("/login")} className='rounded-[16px] border border-[#d1d7db] bg-white px-6 py-3.5 text-sm font-semibold text-[#111b21] transition hover:border-[#00a884] hover:text-[#00a884]'>
                                    Create account
                                </button>
                            </div>
                        </div>

                        <div className='flex flex-col justify-between bg-[linear-gradient(180deg,_rgba(236,255,247,0.88)_0%,_rgba(244,248,246,0.96)_100%)] p-6 sm:p-8 lg:p-10'>
                            <div className='rounded-[26px] border border-white/80 bg-white/80 p-5 shadow-[0_20px_40px_rgba(17,27,33,0.08)]'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#00a884]'>Inside the preview</p>
                                        <h2 className='mt-2 text-2xl font-semibold text-[#111b21]'>You can look around before joining.</h2>
                                    </div>
                                    <div className='flex items-center gap-1.5'>
                                        <span className='h-3 w-3 rounded-full bg-[#ff6b6b]'></span>
                                        <span className='h-3 w-3 rounded-full bg-[#ffd166]'></span>
                                        <span className='h-3 w-3 rounded-full bg-[#06d6a0]'></span>
                                    </div>
                                </div>

                                <div className='mt-6 space-y-4'>
                                    {previewHighlights.map((user, index) => (
                                        <div key={user._id} className={`rounded-[18px] border px-4 py-4 shadow-sm ${index === 0 ? 'border-[#bce5d7] bg-[#ecfff7]' : 'border-[#e6ebee] bg-white'}`}>
                                            <div className='flex items-center gap-3'>
                                                <img src={user.profilePic} alt={user.name} className='h-12 w-12 rounded-full object-cover' />
                                                <div className='min-w-0 flex-1'>
                                                    <div className='flex items-center gap-2'>
                                                        <p className='truncate text-sm font-semibold text-[#111b21]'>{user.name}</p>
                                                        {user.isPreviewOnline && <span className='h-2.5 w-2.5 rounded-full bg-[#25d366]'></span>}
                                                    </div>
                                                    <p className='truncate text-sm text-[#667781]'>{user.bio}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='mt-6 rounded-[24px] border border-[#dfe5e7] bg-[#111b21] p-6 text-white shadow-[0_20px_50px_rgba(17,27,33,0.18)]'>
                                <p className='text-sm font-semibold text-[#7ee6ca]'>What happens in preview mode?</p>
                                <div className='mt-4 space-y-3 text-sm leading-7 text-white/82'>
                                    <p>You can open chats, inspect contacts, and get the overall product feel.</p>
                                    <p>Messaging, media sending, and calls stay locked until you create your account.</p>
                                    <p>The first blocked action clearly tells the visitor: <span className='font-semibold text-white'>Please create your account</span>.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='screen-shell'>
            <div className={`screen-card grid min-h-0 overflow-hidden border border-[#d1d7db] bg-[#111b21]/95 shadow-[0_8px_24px_rgba(11,20,26,0.18)] lg:rounded-[14px] ${selectedUser && isRightSidebarOpen ? 'lg:grid-cols-[clamp(320px,24vw,380px)_minmax(0,1fr)_clamp(280px,22vw,320px)]' : 'lg:grid-cols-[clamp(320px,24vw,380px)_minmax(0,1fr)]'}`}>
                <Sidebar />
                <ChatContainer />
                <RightSidebar />
            </div>
        </div>
    )
}

export default HomePage
