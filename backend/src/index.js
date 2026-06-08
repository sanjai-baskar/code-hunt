require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const runRoutes = require('./routes/run');
const submitRoutes = require('./routes/submit');
const logRoutes = require('./routes/logs');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve static files from the root 'public' directory
// This handles the frontend build when deployed as a monorepo
const publicPath = fs.existsSync(path.join(process.cwd(), 'public'))
  ? path.join(process.cwd(), 'public')
  : path.join(__dirname, '../../public');

app.use(express.static(publicPath));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/problems', '/problems'], problemRoutes);
app.use(['/api/run', '/run'], runRoutes);
app.use(['/api/submit', '/submit'], submitRoutes);
app.use(['/api/logs', '/logs'], logRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/settings', '/settings'], settingsRoutes);

// SPA Catch-all: If it's not an API call, serve the index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist, let the 404 handler take over
      next();
    }
  });
});


// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/diag', async (req, res) => {
  let dbStatus = 'testing';
  try {
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    await p.$connect();
    dbStatus = 'connected';
    await p.$disconnect();
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({
    dbStatus,
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.split(':')[0] : 'none',
    nodeEnv: process.env.NODE_ENV,
    cwd: process.env.NODE_ENV,
    cwd: process.cwd(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Code Hunt API running at http://localhost:${PORT}`);
  });
}


module.exports = app;
