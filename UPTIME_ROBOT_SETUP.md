# Uptime Monitoring Setup for Render

## Option 1: Using Uptime Robot (Recommended - Easy)

Uptime Robot is a free service that monitors your application and keeps it warm.

### Steps:

1. **Go to [UptimeRobot.com](https://uptimerobot.com/)**
2. **Sign up** (free account)
3. **Create a new monitor:**
   - Click "Add New Monitor"
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Code Hunt Backend Health Check`
   - **URL:** `https://your-render-url.onrender.com/api/health`
     - Replace `your-render-url` with your actual Render backend URL
   - **Monitoring Interval:** Every 5 minutes (free plan default)
   - **Click "Create Monitor"**

4. **Get your Render backend URL:**
   - Go to your Render dashboard
   - Click on `code-hunt-backend` service
   - Copy the URL from the top (e.g., `https://code-hunt-backend-xxxx.onrender.com`)

### Benefits:
- ✅ Free forever
- ✅ Monitoring dashboard
- ✅ Email alerts if service goes down
- ✅ Keeps service warm (prevents Render free tier spindown)

---

## Option 2: Using Render Cron Job

If you want to use Render's built-in cron jobs, update your `render.yaml` with the cron service configuration (already added).

### Important:
You need to replace `XXXX` in the cron service with your actual Render backend URL.

1. **Get your backend URL:**
   - Go to Render dashboard → `code-hunt-backend`
   - Copy the full URL

2. **Update `render.yaml`:**
   ```yaml
   - type: cron
     name: code-hunt-uptime-ping
     runtime: node
     buildCommand: npm install
     startCommand: node -e "setInterval(() => { require('https').get('https://code-hunt-backend-XXXX.onrender.com/api/health', r => console.log('ping')); }, 300000);"
     schedule: "0 * * * *"
     envVars:
       - key: NODE_ENV
         value: production
   ```

   Replace `code-hunt-backend-XXXX` with your actual service URL.

3. **Deploy:**
   ```bash
   git add render.yaml
   git commit -m "Add uptime cron job"
   git push origin main
   ```

---

## Health Check Endpoint

The backend already has a health check endpoint at:

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-12T10:30:00.000Z"
}
```

This endpoint is lightweight and doesn't require authentication.

---

## Recommendation

**Use Uptime Robot** (Option 1) for simplicity:
- No code changes needed
- Better monitoring dashboard
- Works across all platforms
- Free tier is more than enough

Save your time and go with Uptime Robot! 🚀
