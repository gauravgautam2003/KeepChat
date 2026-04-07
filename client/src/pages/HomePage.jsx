import { useContext } from 'react'
import Sidebar from '../components/Sidebar'
import RightSidebar from '../components/RightSidebar'
import ChatContainer from '../components/ChatContainer'
import { ChatContext } from '../context/ChatContext'

const HomePage = () => {
    
    const {selectedUser, isRightSidebarOpen} = useContext(ChatContext);
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
