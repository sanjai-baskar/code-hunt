const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/admin/students — list all students
router.get('/students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      include: {
        _count: { select: { submissions: true, distractionLogs: true } },
        submissions: {
          where: { passedTestCases: true },
          select: { id: true },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const studentsWithPassFlag = students.map(s => ({
      ...s,
      hasPassed: s.submissions.length > 0
    }));

    res.json(studentsWithPassFlag);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/student/:id — full profile: submissions + distraction logs
router.get('/student/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const submissions = await prisma.submission.findMany({
      where: { studentId: req.params.id },
      include: { problem: { select: { title: true, difficulty: true } } },
      orderBy: { timestamp: 'desc' },
    });

    const distractionLogs = await prisma.distractionLog.findMany({
      where: { studentId: req.params.id },
      include: { problem: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ student, submissions, distractionLogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
