const RequestLoader = () => {
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-transparent backdrop-blur-[1.5px]">
            <div className="request-loader-google" aria-label="Loading" role="status">
                <span className="request-loader-google-dot request-loader-google-dot-blue" />
                <span className="request-loader-google-dot request-loader-google-dot-red" />
                <span className="request-loader-google-dot request-loader-google-dot-yellow" />
                <span className="request-loader-google-dot request-loader-google-dot-green" />
            </div>
            <div className="sr-only">Loading</div>
        </div>
    )
}

export default RequestLoader
