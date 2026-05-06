const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/logs — save a distraction event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { problemId, direction, startTime, endTime, codeSnapshot } = req.body;
    const studentId = req.user.id;

    if (!problemId || !direction || !startTime || !endTime) {
      return res.status(400).json({ error: 'problemId, direction, startTime, endTime required' });
    }

    const log = await prisma.distractionLog.create({
      data: {
        studentId,
        problemId,
        direction,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        codeSnapshot: codeSnapshot || '',
      },
    });

    res.status(201).json(log);
  } catch (err) {
    console.error('Log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/logs/my/:problemId — get my distraction logs for a problem
router.get('/my/:problemId', authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.distractionLog.findMany({
      where: { studentId: req.user.id, problemId: req.params.problemId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
