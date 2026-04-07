import { useContext, useState } from 'react'
import { FiPhone } from 'react-icons/fi'
import { AuthContext } from '../context/AuthContext'
import toast from 'react-hot-toast'


const LoginPage = () => {
    const [currentState, setCurrentState] = useState("Sign up")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [bio, setBio] = useState("")
    const [phone, setPhone] = useState("")
    const [isDataSubmitted, setIsDataSubmitted] = useState(false)

    const normalizePhone = (value = "") => value.toString().replace(/[^\d+]/g, "").slice(0, 15);



    const { login } = useContext(AuthContext);
    const isSignup = currentState === "Sign up";


    const onSubmitHandler = async (e) => {
        e.preventDefault();

        if (isSignup && !isDataSubmitted) {
            setIsDataSubmitted(true)
            return;
        }

        if (isSignup) {
            // Validate signup data
            if (!name.trim() || !email.trim() || !password.trim() || !bio.trim() || !phone.trim()) {
                toast.error("All fields are required");
                return;
            }
            const normalizedPhone = normalizePhone(phone);
            if (normalizedPhone.length < 10) {
                toast.error("Enter a valid mobile number (at least 10 digits)");
                return;
            }
        } else {
            // Validate login data
            if (!email.trim() || !password.trim()) {
                toast.error("Email and password are required");
                return;
            }
        }

        login(currentState === "Sign up" ? "signup" : "login", { name, email, password, bio, phone })
    }

    return (
        <div className='screen-shell'>
            <div className='auth-card grid overflow-hidden border border-[#d1d7db] bg-[#f7f8fa] shadow-[0_8px_24px_rgba(11,20,26,0.12)] lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)] lg:rounded-[14px]'>
                <div className='hidden h-full overflow-y-auto border-r border-[#dfe5e7] bg-[#e7f0e4] p-10 lg:flex lg:flex-col lg:justify-between'>
                    <div className='space-y-6'>
                        <div className='flex items-center gap-3'>
                            <img src="/favicon.svg" alt="QuickChat" className='h-10 w-10 rounded-full' />
                            <div>
                                <p className='text-xs font-semibold text-[#111b21]'>KeepChat</p>
                                <p className='text-xs text-[#667781]'>Use KeepChat on your browser</p>
                            </div>
                        </div>
                        <div className='space-y-4'>
                            <h1 className='max-w-lg text-2xl font-light leading-tight text-[#111b21]'>Simple. Secure. Ready to chat.</h1>
                            <p className='max-w-xl text-sm leading-6 text-[#41525d]'>
                                Clean sign in and sign up flow like WhatsApp Web, so that users can go directly to conversations.
                            </p>
                        </div>
                        <div className='space-y-2 rounded-[12px] border border-[#d1d7db] bg-white p-4 text-xs text-[#41525d]'>
                            <p>1. Sign in or sign up</p>
                            <p>2. If the other user opens the site, `Active now` will show</p>
                            <p>3. Chat will be ready with real-time sync</p>
                        </div>
                    </div>
                    <p className='text-xs text-[#667781]'>KeepChat works best when both users stay connected, just like WhatsApp Web.</p>
                </div>

                <div className='flex h-full items-center justify-center overflow-y-auto bg-[#f7f8fa] p-5 sm:p-8 lg:p-10'>
                    <form onSubmit={onSubmitHandler} className='my-auto w-full max-w-md space-y-4 rounded-[12px] border border-[#d1d7db] bg-white p-6 text-[#111b21] shadow-[0_2px_8px_rgba(11,20,26,0.08)] sm:p-7'>
                        <div className='space-y-1.5'>
                            <div className='flex items-center gap-3'>
                                <img src="/favicon.svg" alt="QuickChat" className='h-9 w-9 rounded-full lg:hidden' />
                                <p className='text-xs font-medium text-[#00a884]'>{isSignup ? "Create your account" : "Welcome back"}</p>
                            </div>
                            <h2 className='flex items-center justify-between text-[20px] font-light text-[#111b21]'>
                                {currentState}
                                {isDataSubmitted && (
                                    <button type="button" onClick={() => setIsDataSubmitted(false)} className='rounded-full border border-[#d1d7db] px-3 py-1 text-xs text-[#667781] transition hover:border-[#00a884] hover:text-[#111b21]'>
                                        Back
                                    </button>
                                )}
                            </h2>
                            <p className='text-xs text-[#667781]'>Message privately with friends and contacts.</p>
                        </div>

                        {isSignup && !isDataSubmitted && (
                            <>
                                <input onChange={(e) => setName(e.target.value)} value={name} type="text" className='wa-auth-input text-sm' placeholder='Full name' required />
                                <div className='flex items-center gap-2 border-b-2 border-[#dfe5e7] '>
                                    <FiPhone className='text-[#8696a0]' />
                                    <input onChange={(e) => setPhone(e.target.value)} value={phone} type="tel" className='w-full bg-transparent py-2 text-[#111b21] outline-none placeholder:text-[#8696a0] text-sm' placeholder='Mobile number' required />
                                </div>
                            </>
                        )}
                        {!isDataSubmitted && (
                            <>
                                <input onChange={(e) => setEmail(e.target.value)} value={email} type="email" placeholder='Email address' required className='wa-auth-input text-sm' />
                                <input onChange={(e) => setPassword(e.target.value)} value={password} type="password" placeholder='Password' required className='wa-auth-input text-sm' />
                            </>
                        )}
                        {isSignup && isDataSubmitted && (
                            <textarea onChange={(e) => setBio(e.target.value)} value={bio} rows={4} className='wa-auth-input resize-none' placeholder='Write a short about line' required />
                        )}

                        <button type='submit' className='w-full rounded-[10px] bg-[#00a884] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#00926f]'>
                            {isSignup ? (isDataSubmitted ? "Create Account" : "Continue") : "Login Now"}
                        </button>

                        <label className='flex items-start gap-3 rounded-[10px] border border-[#dfe5e7] bg-[#f7f8fa] p-3 text-xs text-[#667781]'>
                            <input type="checkbox" className='mt-1 accent-[#00a884]' defaultChecked />
                            <span>Agree to the terms of use and privacy policy before entering the app.</span>
                        </label>

                        {isSignup ? (
                            <p className='text-xs text-[#667781]'>Already have an account? <span onClick={() => { setCurrentState("Login"); setIsDataSubmitted(false) }} className='cursor-pointer font-medium text-[#00a884]'>Login here</span></p>
                        ) : (
                            <p className='text-xs text-[#667781]'>Need a new account? <span onClick={() => { setCurrentState("Sign up"); setIsDataSubmitted(false) }} className='cursor-pointer font-medium text-[#00a884]'>Create one</span></p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
