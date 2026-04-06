# KeepChat

A modern, real-time chat application built with React, Node.js, and Socket.io. Experience seamless messaging with video/voice calling capabilities, just like WhatsApp Web.

![KeepChat Preview](https://via.placeholder.com/800x400/111b21/e9edef?text=KeepChat+Preview)

## ✨ Features

### 💬 Core Messaging
- **Real-time messaging** with instant delivery
- **Image sharing** with Cloudinary integration
- **Message deletion** (for you or everyone)
- **Message status** (seen/unseen indicators)
- **Online status** tracking

### 📞 Video & Voice Calling
- **HD video calls** with WebRTC
- **Voice calls** with crystal clear audio
- **Screen sharing** capabilities
- **Mute/unmute** controls
- **Camera on/off** toggle

### 👤 User Management
- **Secure authentication** with JWT
- **Profile customization** with avatars
- **Bio and status** updates
- **Last seen** tracking
- **Password encryption** with bcrypt

### 🎨 Modern UI/UX
- **WhatsApp-inspired design**
- **Responsive layout** for all devices
- **Dark theme** with elegant gradients
- **Smooth animations** and transitions
- **Toast notifications** for feedback

## 🚀 Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time communication
- **React Router** - Client-side routing
- **React Hot Toast** - Notification system

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.io** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Image hosting and management

## 📋 Prerequisites

Before running this application, make sure you have:
- **Node.js** (v16 or higher)
- **MongoDB** (local or cloud instance)
- **npm** or **yarn** package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gauravgautam2003/KeepChat.git
   cd KeepChat
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Setup**

   Create `.env` file in the server directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/keepchat
   JWT_SECRET=your_jwt_secret_key_here
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   CLIENT_URL=http://localhost:5173
   ```

## 🚀 Running the Application

### Development Mode

1. **Start the server** (from server directory)
   ```bash
   npm run server
   ```

2. **Start the client** (from client directory)
   ```bash
   npm run dev
   ```

3. **Open your browser**
   ```
   http://localhost:5173
   ```

### Production Build

1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Start the server**
   ```bash
   cd ../server
   npm start
   ```

## 📁 Project Structure

```
KeepChat/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── assets/        # Images and icons
│   │   ├── components/    # Reusable components
│   │   │   ├── CallModal.jsx
│   │   │   ├── CallOverlay.jsx
│   │   │   ├── ChatContainer.jsx
│   │   │   ├── RightSidebar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ...
│   │   ├── context/       # React context
│   │   ├── lib/           # Utilities
│   │   ├── pages/         # Page components
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── lib/              # Database and utilities
│   ├── middleware/       # Authentication middleware
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── server.js         # Main server file
│   └── package.json
├── README.md
└── LICENSE.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `PUT /api/users/profile` - Update user profile

### Messages
- `GET /api/messages/:userId` - Get messages with a user
- `POST /api/messages/send/:userId` - Send a message
- `DELETE /api/messages/:messageId` - Delete a message

### Real-time Events (Socket.io)
- `connection` - User connects
- `disconnect` - User disconnects
- `getOnlineUsers` - Get online users list
- `sendMessage` - Send message
- `messageReceived` - Receive message
- `call:offer` - Initiate call
- `call:answer` - Answer call
- `call:ice-candidate` - WebRTC ICE candidates

## 🎯 Key Features Explained

### Real-time Communication
The app uses Socket.io for bidirectional communication between client and server, enabling instant messaging and live updates.

### WebRTC Calling
Video and voice calls are powered by WebRTC technology, providing peer-to-peer communication without third-party services.

### Image Upload
Images are uploaded to Cloudinary for optimized storage and delivery, with automatic compression and format optimization.

### Security
- Passwords are hashed using bcryptjs
- JWT tokens for session management
- Input validation and sanitization
- CORS protection

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- **WhatsApp** for design inspiration
- **Socket.io** for real-time communication
- **WebRTC** for calling functionality
- **Tailwind CSS** for styling
- **React** community for amazing tools

## 📞 Support

If you have any questions or need help, feel free to:
- Open an issue on GitHub
- Contact the maintainers
- Check the documentation

---

**Made with ❤️ by [Gaurav Gautam](https://github.com/gauravgautam2003)**