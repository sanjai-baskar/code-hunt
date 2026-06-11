const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');
const { runCode } = require('../utils/executor');

// POST /api/submit — final submission (runs code + saves to DB)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { code, problemId, distractionCount = 0, language = 'java' } = req.body;
    const studentId = req.user.id;

    if (!code || !problemId) {
      return res.status(400).json({ error: 'code and problemId are required' });
    }

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const testCases = JSON.parse(problem.testCases);
    const results = await runCode(code, testCases, problem.functionName, language);
    const allPassed = results.every((r) => r.passed);
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = testCases.length;

    const submission = await prisma.submission.create({
      data: {
        studentId,
        problemId,
        code,
        output: JSON.stringify(results),
        passedTestCases: allPassed,
        passedCount,
        totalCount,
        distractionCount: distractionCount || 0,
      },
    });

    res.status(201).json({
      submission,
      results,
      allPassed,
      summary: { passed: passedCount, total: totalCount },
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/submit/my — current student's submissions
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.user.id },
      include: { problem: { select: { title: true, difficulty: true } } },
      orderBy: { timestamp: 'desc' },
    });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
