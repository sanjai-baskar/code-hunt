const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/problems — list all problems (student + admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        submissions: {
          where: { studentId: req.user.id, passedTestCases: true },
          take: 1,
        },
      },
    });
    const isAdmin = req.user.role === 'admin';
    const parsed = problems.map((p) => {
      const cases = JSON.parse(p.testCases);
      const isSolved = p.submissions && p.submissions.length > 0;
      // Remove submissions from payload to save bandwidth
      const { submissions, ...problemData } = p;
      return {
        ...problemData,
        isSolved,
        testCases: isAdmin ? cases : cases.filter(c => !c.hidden),
      };
    });
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/problems/:id — single problem
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await prisma.problem.findUnique({ where: { id: req.params.id } });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    const isAdmin = req.user.role === 'admin';
    const cases = JSON.parse(problem.testCases);
    res.json({ 
      ...problem, 
      testCases: isAdmin ? cases : cases.filter(c => !c.hidden) 
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/problems — create (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, difficulty, category, testCases, functionName } = req.body;
    if (!title || !description || !testCases || !Array.isArray(testCases)) {
      return res.status(400).json({ error: 'title, description, testCases[] required' });
    }
    const problem = await prisma.problem.create({
      data: {
        title,
        description,
        difficulty: difficulty || 'Easy',
        category: category || 'All',
        testCases: JSON.stringify(testCases),
        functionName: functionName || 'solution',
      },
    });
    res.status(201).json({ ...problem, testCases: JSON.parse(problem.testCases) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/problems/:id — update (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, difficulty, category, testCases, functionName } = req.body;
    const data = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (difficulty) data.difficulty = difficulty;
    if (category) data.category = category;
    if (testCases) data.testCases = JSON.stringify(testCases);
    if (functionName) data.functionName = functionName;

    const problem = await prisma.problem.update({ where: { id: req.params.id }, data });
    res.json({ ...problem, testCases: JSON.parse(problem.testCases) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/problems/:id — delete (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.distractionSummary.deleteMany({ where: { problemId: req.params.id } });
    await prisma.submission.deleteMany({ where: { problemId: req.params.id } });
    await prisma.problem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Problem deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
