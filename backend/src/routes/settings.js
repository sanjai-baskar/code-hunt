const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/settings/webcam — public endpoint (no auth needed) for students to check webcam status
router.get('/webcam', async (req, res) => {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', webcamEnabled: true },
    });
    res.json({ webcamEnabled: settings.webcamEnabled });
  } catch (err) {
    // Default to enabled on error (safe fallback)
    res.json({ webcamEnabled: true });
  }
});

module.exports = router;
