const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');

// PATCH /api/student/profile — update student's class and year
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can update their profile' });
    }

    const { class: studentClass, year } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(studentClass !== undefined && { class: studentClass }),
        ...(year !== undefined && { year }),
      },
      select: { id: true, name: true, email: true, class: true, year: true, role: true },
    });

    res.json(updated);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/student/profile — get current student's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, class: true, year: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;