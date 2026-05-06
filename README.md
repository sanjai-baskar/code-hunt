# Code Hunt 🎯

A production-ready coding platform with AI-powered face monitoring.

## ✨ Features
- **Dual Roles**: Admin (Manage problems, monitor students) & Student (Solve challenges).
- **AI Face Monitoring**: Real-time head pose tracking (yaw/pitch) via `face-api.js`.
- **Sustained Distraction Rule**: 10-second look-away threshold before logging events.
- **Secure Sandbox**: JavaScript code execution using Node.js `vm` module.
- **Modern UI**: Deep space theme with glassmorphism and neon aesthetics.
- **Persistance**: SQLite (Local) / PostgreSQL (Prod) via Prisma ORM.

## 🚀 Setup Instructions

### 1. Backend Setup
1. `cd backend`
2. `npm install`
3. Rename `.env.example` to `.env` (defaults are fine for local).
4. `npm run db:push` (Initializes SQLite database).
5. `npm run db:seed` (Creates demo accounts and initial problems).
6. `npm run dev` (Starts API on port 3001).

### 2. Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Starts app on port 5173).

### 3. Face-API Models (Optional for offline)
If you have no internet or want faster loading:
1. `node scripts/download-models.js` (Downloads weights to `frontend/public/models`).

## 🔑 Demo Credentials
- **Admin**: `admin@codehunt.com` / `admin123`
- **Student**: `student@codehunt.com` / `student123`

## 🛡️ Proctored Environment
- **Webcam Monitor**: Draggable floating box tracking eye/head orientation.
- **Thresholds**: 10s sustained look away (Left, Right, Up, Down).
- **Enforcement**: After 3 distraction events, the browser enters fullscreen and shows a persistent warning banner.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Monaco Editor, face-api.js.
- **Backend**: Node.js, Express, Prisma ORM.
- **Database**: SQLite (Local), PostgreSQL (Production).
- **Deployment**: Vercel ready.

## 📄 License
MIT
