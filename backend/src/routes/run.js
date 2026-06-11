const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');
const { runCode } = require('../utils/executor');



// POST /api/run — execute code against all test cases (no DB write)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { code, problemId, customInput, language = 'java' } = req.body;

    if (!code || !problemId) {
      return res.status(400).json({ error: 'code and problemId are required' });
    }

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    let testCases;
    if (customInput !== undefined && customInput !== null) {
      // Use custom input
      testCases = [{ input: customInput, output: '' }];
    } else {
      // Use predefined test cases (only non-hidden ones for /run)
      testCases = JSON.parse(problem.testCases).filter(c => !c.hidden);
    }
    
    const results = await runCode(code, testCases, problem.functionName, language);
    const passedCount = results.filter((r) => r.passed).length;

    res.json({
      results,
      allPassed: passedCount === testCases.length,
      summary: { passed: passedCount, total: testCases.length },
    });
  } catch (err) {
    console.error('Run error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
