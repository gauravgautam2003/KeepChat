# Deployment Checklist

## 1. Server on Render

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

### Required environment variables

- `PORT=5000`
- `MONGO_DB=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/keepChat?retryWrites=true&w=majority`
- `JWT_SECRET=<your-secret>`
- `CLOUDINARY_CLOUD_NAME=<your-cloud-name>`
- `CLOUDINARY_API_KEY=<your-api-key>`
- `CLOUDINARY_API_SECRET=<your-api-secret>`
- `CLIENT_URL=https://keep-chat.vercel.app`

### Important checks

- If `MONGO_URI` exists in Render, delete it or make it exactly the same as `MONGO_DB`.
- Do not keep malformed values like `...w=majority/chat-app`.
- After changing env vars, redeploy the service.

## 2. Client on Vercel

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

### Required environment variables

- `VITE_BACKEND_URL=https://keep-chat.onrender.com`

### Important checks

- `vercel.json` is already added for SPA rewrites.
- Redeploy Vercel after any route or env change.

## 3. Post-deploy test flow

- Open `https://keep-chat.onrender.com/api/status`
  Expected: `server is live`
- Open `https://keep-chat.vercel.app`
- Sign up or log in
- Refresh the page
  Expected: user remains logged in
- Open `/profile`
  Expected: no 404
- Update profile with and without image
  Expected: no 500
- Send text message
  Expected: message appears instantly
- Send image message
  Expected: image uploads and displays
- Open contact info drawer
  Expected: works on mobile and desktop
- Start audio/video call
  Expected: overlay fits mobile viewport

## 4. If a 500 error still happens

- Check Render logs first.
- If profile/image upload fails, verify Cloudinary env vars.
- If auth or chat fails, verify MongoDB URI and JWT secret.
- If frontend route fails on refresh, redeploy Vercel so rewrite rules apply.

## 5. Security cleanup

- Remove real secrets from local tracked files.
- Rotate MongoDB, JWT, and Cloudinary credentials if they were exposed.
- Keep secrets only in Render/Vercel environment settings.
