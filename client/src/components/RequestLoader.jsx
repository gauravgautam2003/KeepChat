const RequestLoader = ({ message = "Server is processing your request..." }) => {
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#0b141a]/28 backdrop-blur-[2px]">
            <div className="mx-4 w-full max-w-sm rounded-[18px] border border-[#d1d7db] bg-white px-5 py-4 text-[#111b21] shadow-[0_24px_80px_rgba(11,20,26,0.22)]">
                <div className="flex items-center gap-4">
                    <div className="request-loader-spinner" aria-hidden="true" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold">Processing</p>
                        <p className="text-xs leading-5 text-[#667781]">{message}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RequestLoader
