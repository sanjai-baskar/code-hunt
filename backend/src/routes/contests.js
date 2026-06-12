const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/contests - Get all contests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contests = await prisma.contest.findMany({
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        _count: {
          select: { problems: true }
        }
      }
    });
    res.json(contests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/contests/:id - Get contest details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      include: {
        problems: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            category: true,
            points: true,
          }
        }
      }
    });

    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Only hide problems if the contest hasn't started yet
    // Past contests remain fully visible so students can review solutions
    const now = new Date();
    if (new Date(contest.startTime) > now) {
      contest.problems = [];
    }

    res.json(contest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/contests/:id/my-progress - Get current student's best submission per problem
router.get('/:id/my-progress', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;

    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      select: { problemIds: true },
    });

    if (!contest) return res.status(404).json({ error: 'Contest not found' });

    // Get all submissions for this student for the problems in this contest
    const submissions = await prisma.submission.findMany({
      where: {
        studentId,
        problemId: { in: contest.problemIds },
      },
      orderBy: { timestamp: 'desc' },
      select: {
        problemId: true,
        passedTestCases: true,
        passedCount: true,
        totalCount: true,
        timestamp: true,
      },
    });

    // Keep only the best submission per problem (most passed test cases)
    const bestByProblem = {};
    for (const sub of submissions) {
      const existing = bestByProblem[sub.problemId];
      if (!existing || sub.passedCount > existing.passedCount) {
        bestByProblem[sub.problemId] = sub;
      }
    }

    res.json(bestByProblem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/contests/:id/leaderboard - Get contest leaderboard (admin only)
router.get('/:id/leaderboard', authenticateToken, async (req, res) => {
  try {
    // Admin role check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view leaderboard' });
    }

    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        problemIds: true,
      }
    });

    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Handle empty problemIds
    if (!contest.problemIds || contest.problemIds.length === 0) {
      console.warn(`Contest ${req.params.id} has no problems assigned`);
      return res.json([]);
    }

    // Get all submissions for the problems in this contest within the contest timeframe
    const submissions = await prisma.submission.findMany({
      where: {
        problemId: { in: contest.problemIds },
        timestamp: {
          gte: contest.startTime,
          lte: contest.endTime,
        }
      },
      orderBy: { timestamp: 'asc' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        problem: { select: { id: true, points: true } }
      }
    });

    if (!submissions || submissions.length === 0) {
      console.log(`Contest ${req.params.id} has no submissions yet`);
      return res.json([]);
    }

    // Calculate leaderboard with detailed metrics
    const participantMap = new Map();

    submissions.forEach(sub => {
      const studentId = sub.student.id;
      if (!participantMap.has(studentId)) {
        participantMap.set(studentId, {
          user: sub.student,
          points: 0,
          timePenalty: 0,
          solvedProblems: new Set(),
          totalTestCasesPassed: 0,
          firstSolveTime: null,
        });
      }

      const participant = participantMap.get(studentId);

      // Count test cases passed
      if (sub.passedCount) {
        participant.totalTestCasesPassed += sub.passedCount;
      }

      // Only count points for the first successful submission for each problem
      if (sub.passedTestCases && !participant.solvedProblems.has(sub.problemId)) {
        participant.solvedProblems.add(sub.problemId);
        participant.points += sub.problem.points;

        // Time penalty in minutes from the start of the contest
        const timeTakenMs = new Date(sub.timestamp) - new Date(contest.startTime);
        participant.timePenalty += Math.floor(timeTakenMs / 60000);
        
        // Track first solve time
        if (!participant.firstSolveTime) {
          participant.firstSolveTime = new Date(sub.timestamp);
        }
      }
    });

    const leaderboard = Array.from(participantMap.values()).map(p => ({
      user: p.user,
      points: p.points,
      timePenalty: p.timePenalty,
      solvedCount: p.solvedProblems.size,
      totalTestCasesPassed: p.totalTestCasesPassed,
      firstSolveTime: p.firstSolveTime ? new Date(p.firstSolveTime).getTime() - new Date(contest.startTime).getTime() : null,
    }));

    // Sort by points (descending) and then time penalty (ascending)
    leaderboard.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.timePenalty - b.timePenalty;
    });

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
