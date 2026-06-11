const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');


// POST /api/logs — upsert distraction summary (lightweight, one row per student+problem)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { problemId } = req.body;
    const studentId = req.user.id;

    if (!problemId) {
      return res.status(400).json({ error: 'problemId is required' });
    }

    // Upsert: create or increment the distraction count for this student+problem session
    const summary = await prisma.distractionSummary.upsert({
      where: { studentId_problemId: { studentId, problemId } },
      update: {
        hadDistraction: true,
        distractionCount: { increment: 1 },
      },
      create: {
        studentId,
        problemId,
        hadDistraction: true,
        distractionCount: 1,
      },
    });

    res.status(201).json(summary);
  } catch (err) {
    console.error('Log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
