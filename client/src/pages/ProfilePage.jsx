import { useContext, useState } from 'react'
import { FiPhone } from 'react-icons/fi'
import {useNavigate } from 'react-router-dom'
import assets from '../assets/assets'
import { AuthContext } from '../context/AuthContext'


const ProfilePage = () => {

    const {authUser, updateProfile} = useContext(AuthContext) 
    const navigate  = useNavigate()

    const [selectedImage, setSelectedImage] = useState(null)
    const [name, setName] = useState(authUser.name)
    const [bio,setBio] = useState(authUser.bio)
    const [phone, setPhone] = useState(authUser.phone || "")

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!selectedImage){
            await updateProfile({name, bio, phone});
            navigate('/')
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(selectedImage);
        reader.onload = async () => {
            const base64Image = reader.result;
            await updateProfile({profilePic: base64Image, name, bio, phone});
            navigate("/");
        }
    }

    return (
        <div className='screen-shell flex items-center justify-center'>
            <div className='profile-card grid overflow-hidden rounded-[14px] border border-[#d1d7db] bg-[#f7f8fa] text-[#111b21] shadow-[0_8px_24px_rgba(11,20,26,0.12)] lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.82fr)]'>
                <form onSubmit={handleSubmit} className='flex h-full flex-col justify-center gap-4 overflow-y-auto p-5 sm:p-8'>
                    <div className='space-y-1.5'>
                        <div className='flex items-center gap-2'>
                            <img src="/favicon.svg" alt="KeepChat" className='h-5 w-5 rounded-full' />
                            <p className='text-xs font-medium text-[#00a884]'>Profile</p>
                        </div>
                        <h3 className='text-[20px] font-light'>Edit profile</h3>
                        <p className='text-xs text-[#667781]'>Update your photo, name and about.</p>
                    </div>
                    <label htmlFor="avatar" className='flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#dfe5e7] bg-white px-3 py-2 '>
                        <input onChange={(e) => setSelectedImage(e.target.files[0])} type="file" id='avatar' accept='image/*' hidden />
                        <img src={selectedImage ? URL.createObjectURL(selectedImage) : authUser?.profilePic || assets.avatar_icon} alt="" className='h-12 w-12 rounded-full object-cover'/>
                        <span className='text-xs text-[#667781]'>Upload profile image...</span>
                    </label>
                    <input onChange={(e) => setName(e.target.value)} value={name} type="text" required placeholder='Your name' className='border-b-1 border-gray-300 py-1 px-3' />
                    <div className='flex items-center gap-2 border-b-1 border-[#dfe5e7]'>
                        <FiPhone className='text-[#707a81]  ' />
                        <input onChange={(e) => setPhone(e.target.value)} value={phone} type="tel" placeholder='Your mobile number' className='w-full bg-transparent py-1 text-[#111b21] outline-none placeholder:text-[#8696a0] ' />
                    </div>
                    <textarea onChange={(e) => setBio(e.target.value)} value={bio} placeholder='Write profile bio' rows={4} className='border-b-1 border-gray-300 resize-none p-1'></textarea>
                    <div className='flex gap-3'>
                        <button type='submit' className='rounded-[10px] bg-[#00a884] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#00926f]'>Save Changes</button>
                        <button type='button' onClick={() => navigate('/')} className='rounded-[10px] border border-[#d1d7db] px-5 py-2 text-sm text-[#667781] transition hover:border-[#00a884] hover:text-[#111b21]'>Cancel</button>
                    </div>
                </form>
                <div className='flex h-full flex-col items-center justify-center gap-4 overflow-y-auto border-t border-[#dfe5e7] bg-[#e7f0e4] p-6 sm:p-8 lg:border-l lg:border-t-0'>
                    <img src={selectedImage ? URL.createObjectURL(selectedImage) : authUser?.profilePic || assets.avatar_icon} alt="" className='h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg' />
                    <div className='space-y-1.5 text-center'>
                        <h4 className='text-md font-semibold text-[#111b21]'>{name}</h4>
                        <p className='text-xs text-[#00a884]'>{phone || "Add a mobile number"}</p>
                        <p className='max-w-xs text-xs text-[#667781]'>{bio || "Add a status so people know what you're up to."}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage
