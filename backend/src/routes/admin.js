const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/admin/students — list all students with summary data
router.get('/students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        submissions: {
          where: { passedTestCases: true },
          select: {
            id: true,
            problem: { select: { id: true, title: true, difficulty: true } },
            timestamp: true,
          },
          orderBy: { timestamp: 'desc' },
        },
        distractionSummaries: {
          select: {
            problemId: true,
            hadDistraction: true,
            distractionCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build summary per student
    const result = students.map(s => {
      const summaries = s.distractionSummaries || [];
      const totalDistractions = summaries.reduce((acc, d) => acc + d.distractionCount, 0);
      const hadAnyDistraction = summaries.some(d => d.hadDistraction);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        createdAt: s.createdAt,
        solvedProblems: s.submissions || [],
        solvedCount: (s.submissions || []).length,
        totalDistractions,
        hadDistraction: hadAnyDistraction,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/admin/student/:id — detailed profile for one student
router.get('/student/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true,
        submissions: {
          select: {
            id: true,
            passedTestCases: true,
            distractionCount: true,
            timestamp: true,
            problem: { select: { id: true, title: true, difficulty: true } },
          },
          orderBy: { timestamp: 'desc' },
        },
        distractionSummaries: {
          select: {
            problemId: true,
            hadDistraction: true,
            distractionCount: true,
            lastUpdated: true,
            problem: { select: { title: true } },
          },
        },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const solvedProblems = (student.submissions || []).filter(s => s.passedTestCases);
    const summaries = student.distractionSummaries || [];
    const totalDistractions = summaries.reduce((acc, d) => acc + d.distractionCount, 0);
    const hadDistraction = summaries.some(d => d.hadDistraction);

    res.json({
      student: { id: student.id, name: student.name, email: student.email },
      submissions: student.submissions,
      solvedProblems,
      distractionSummaries: student.distractionSummaries,
      totalDistractions,
      hadDistraction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/admin/settings — get current site settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', webcamEnabled: true },
    });
    res.json(settings);
  } catch (err) {
    console.error('Settings GET error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/admin/settings/webcam — toggle webcam on/off
router.post('/settings/webcam', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { webcamEnabled } = req.body;
    if (typeof webcamEnabled !== 'boolean') {
      return res.status(400).json({ error: 'webcamEnabled must be a boolean' });
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: { webcamEnabled },
      create: { id: 'global', webcamEnabled },
    });

    res.json(settings);
  } catch (err) {
    console.error('Settings POST error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
