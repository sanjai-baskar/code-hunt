require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const runRoutes = require('./routes/run');
const submitRoutes = require('./routes/submit');
const logRoutes = require('./routes/logs');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/problems', problemRoutes);
app.use('/run', runRoutes);
app.use('/submit', submitRoutes);
app.use('/logs', logRoutes);
app.use('/admin', adminRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/diag', async (req, res) => {
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

if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_DEV === 'true') {
  app.listen(PORT, () => {
    console.log(`🚀 Code Hunt API running at http://localhost:${PORT}`);
  });
}


module.exports = app;
