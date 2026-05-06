# Code Hunt 🎯

A production-ready coding platform with AI-powered face monitoring.

## ✨ Features
- **Dual Roles**: Admin (Manage problems, monitor students) & Student (Solve challenges).
- **AI Face Monitoring**: Real-time head pose tracking (yaw/pitch) via `MediaPipe FaceMesh` and `TensorFlow.js`.
- **Sustained Distraction Rule**: 2.5-second look-away threshold for rapid response.
- **Security Arena**: Blocks Copy/Paste, Right-click, and Tab switching.
- **Unified Portal**: Professional Home page with role selection.
- **Secure Sandbox**: JavaScript/Java code execution.
- **Modern UI**: Clean LeetCode-inspired interface with responsive design.
- **Persistence**: PostgreSQL (Neon) via Prisma ORM.

## 🚀 Setup Instructions

### 1. Root Installation
1. `npm install` (Installs all dependencies and generates Prisma client).
2. Configure `.env` with your `DATABASE_URL`.

### 2. Run Locally
1. **Backend**: `node backend/src/index.js`
2. **Frontend**: `cd frontend && npm run dev`

## 🛡️ Proctored Environment
- **Webcam Monitor**: Floating AI-powered box tracking eye/head orientation.
- **Detection**: High-sensitivity Yaw/Pitch estimation for Left, Right, and Up.
- **Enforcement**: Immediate logging of security violations (Copy/Paste, Tab switching).

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Monaco Editor, MediaPipe FaceMesh, COCO-SSD.
- **Backend**: Node.js, Express, Prisma ORM.
- **Database**: PostgreSQL.
- **Deployment**: Optimized for Vercel (monorepo).


## 📄 License
MIT
