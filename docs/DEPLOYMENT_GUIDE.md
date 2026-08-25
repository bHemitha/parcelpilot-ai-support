# 🚀 ParcelPilot Cloud Deployment Guide

This application is architected for **zero-configuration, single-URL full-stack deployment** on any modern cloud hosting platform (Render, Railway, Fly.io, Heroku, AWS, or GCP).

---

## ⚡ Option 1: Free 1-Click Deployment on Render.com (Recommended)

1. Push your repository to **GitHub** (e.g. `https://github.com/your-username/parcelpilot-ai-support`).
2. Go to **[Render.com](https://render.com)** and click **New + Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: `your_gemini_api_key_here` (or your preferred key)
   - `REFERENCE_TIMESTAMP`: `2026-08-16T11:00:00+05:30`
6. Click **Deploy Web Service**!
   - Render will build the frontend, start the server, and give you a live HTTPS link (e.g. `https://parcelpilot-ai.onrender.com`).

---

## ⚡ Option 2: 1-Click Deployment on Railway.app

1. Go to **[Railway.app](https://railway.app)** and click **New Project -> Deploy from GitHub repo**.
2. Select your repository.
3. In **Variables**, add:
   - `GEMINI_API_KEY`: `your_gemini_api_key_here`
   - `REFERENCE_TIMESTAMP`: `2026-08-16T11:00:00+05:30`
4. Railway automatically detects `npm run build` and `npm start` and deploys your application on a live public URL.

---

## 🛠️ How It Works in Production (Single URL Architecture)

When deployed to production:
1. `npm run build` generates optimized static production assets in `frontend/dist`.
2. `npm start` launches `backend/server.js`.
3. The Express server automatically:
   - Serves the React web app at the root (`/`)
   - Serves REST API endpoints under (`/api/*`)
   - Serves Server-Sent Events real-time sync at (`/api/events`)
   - Automatically initializes and seeds the SQLite database (`parcelpilot.db`) if not already present.

No separate backend/frontend domains or complex CORS setup needed!
