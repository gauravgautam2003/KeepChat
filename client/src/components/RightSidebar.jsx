import assets from '../assets/assets'
import { useContext } from 'react'
import { FiImage, FiLogOut, FiPhone } from 'react-icons/fi'
import { ChatContext } from '../context/ChatContext'
import { AuthContext } from '../context/AuthContext'
import { useState } from 'react'
import { useEffect } from 'react'
import { formatLastSeen, formatPhoneNumber } from '../lib/utils'

const RightSidebar = () => {

    const {selectedUser, messages} = useContext(ChatContext)
    const {onlineUsers, logout} = useContext(AuthContext)
    const [messageImages, setMessageImages] = useState([])

    //get all the images from messages and set them to state

    useEffect(() => {
        const images = messages.filter(msg => msg.image).map(msg => msg.image)
        setMessageImages(images)
    },[messages])

    return selectedUser && (
        <div className='hidden min-h-0 border-l border-[#d1d7db] bg-[#f0f2f5] text-[#111b21] lg:flex lg:flex-col'>
            <div className='flex h-[65px] items-center border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-3'>
                <p className='text-sm font-medium text-[#41525d]'>Contact info</p>
            </div>
            <div className='flex-1 min-h-0 overflow-y-auto p-6'>
                <div className='flex flex-col items-center gap-1 rounded-[10px] bg-white p-6 text-center shadow-[0_1px_3px_rgba(11,20,26,0.08)]'>
                    <img src={selectedUser?.profilePic || assets.avatar_icon} alt="" className='h-24 w-24 rounded-full object-cover' />
                    <h1 className='flex items-center gap-2 text-md font-semibold'>
                        {(onlineUsers || []).includes(selectedUser._id) && <span className='h-2.5 w-2.5 rounded-full bg-[#25d366]'></span>}
                        {selectedUser.name}
                    </h1>
                    <p className={`text-xs ${(onlineUsers || []).includes(selectedUser._id) ? 'text-[#00a884]' : 'text-[#667781]'}`}>
                        {(onlineUsers || []).includes(selectedUser._id) ? 'Active now' : formatLastSeen(selectedUser.lastSeen)}
                    </p>
                    <p className='text-xs leading-6 text-[#667781]'>{selectedUser.bio || "No status added yet."}</p>
                    <div className='flex items-center gap-2 rounded-full bg-[#f0f2f5] px-3 py-1.5 text-xs text-[#41525d]'>
                        <FiPhone className='text-[#00a884]' />
                        <span>{formatPhoneNumber(selectedUser.phone)}</span>
                    </div>
                </div>

                <div className='mt-6 rounded-[10px] bg-white p-5 shadow-[0_1px_3px_rgba(11,20,26,0.08)]'>
                    <p className='flex items-center gap-2 text-sm font-medium text-[#41525d]'>
                        <FiImage />
                        Shared media
                    </p>
                    <div className='mt-4 grid grid-cols-2 gap-3'>
                        {messageImages.length ? messageImages.map((url,index)=>(
                            <button key={index} onClick={() => window.open(url, "_blank")} className='overflow-hidden rounded-[8px] border border-[#e9edef] transition hover:border-[#86cbb5]'>
                                <img src={url} alt="" className='h-28 w-full object-cover'/>
                            </button>

                        )) : (
                            <p className='col-span-2 text-xs text-[#667781]'>No images shared in this chat yet.</p>
                        )}
                    </div>
                </div>
                <button onClick={() => logout()} className='mt-6 flex w-full items-center justify-center gap-2 rounded-[10px] bg-white px-4 py-3 text-sm font-medium text-[#c65353] shadow-[0_1px_3px_rgba(11,20,26,0.08)] transition hover:bg-[#fff5f5]'>
                    <FiLogOut />
                    Logout
                </button>
            </div>
        </div>
    )
}

export default RightSidebar
