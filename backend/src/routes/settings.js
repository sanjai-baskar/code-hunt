const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');



const jwt = require('jsonwebtoken');

// GET /api/settings/webcam — public endpoint (no auth needed) for students to check webcam status
router.get('/webcam', async (req, res) => {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', webcamEnabled: true },
    });
    
    let isWebcamEnabled = settings.webcamEnabled;

    // Check individual user setting if token is provided
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const user = await prisma.user.findUnique({ where: { id: decoded.id } });
          if (user && user.webcamEnabled === false) {
            isWebcamEnabled = false; // Override global setting if user is exempted
          }
        }
      } catch (err) {
        // Ignore token errors here, fallback to global settings
      }
    }

    res.json({ webcamEnabled: isWebcamEnabled });
  } catch (err) {
    // Default to enabled on error (safe fallback)
    res.json({ webcamEnabled: true });
  }
});

module.exports = router;
