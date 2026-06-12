import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function Leaderboard({ contestId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get(`/contests/${contestId}/leaderboard`);
        setLeaderboard(res.data);
      } catch (err) {
        console.error('Leaderboard error:', err.response?.data || err.message);
        const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to load leaderboard.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    if (contestId) {
      fetchLeaderboard();
      // Refresh every 30 seconds
      const interval = setInterval(fetchLeaderboard, 30000);
      return () => clearInterval(interval);
    }
  }, [contestId]);

  if (loading) return <div className="text-center p-8 text-muted">Loading Leaderboard...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  const formatTime = (ms) => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-surface border-border border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="px-6 py-4 font-bold text-muted w-16 text-center">Rank</th>
              <th className="px-6 py-4 font-bold text-muted">Participant</th>
              <th className="px-6 py-4 font-bold text-muted text-center">Solved</th>
              <th className="px-6 py-4 font-bold text-muted text-center">Test Cases</th>
              <th className="px-6 py-4 font-bold text-brand text-right">Points</th>
              <th className="px-6 py-4 font-bold text-muted text-right">Time Taken</th>
              <th className="px-6 py-4 font-bold text-muted text-right">Penalty (min)</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-muted">
                  No submissions yet.
                </td>
              </tr>
            ) : (
              leaderboard.map((entry, index) => (
                <tr key={entry.user.id} className="border-b border-border hover:bg-background/50 transition-colors">
                  <td className="px-6 py-4 text-center font-bold">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{entry.user.name}</p>
                    <p className="text-[10px] text-muted">{entry.user.email}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-muted font-medium">
                    {entry.solvedCount}
                  </td>
                  <td className="px-6 py-4 text-center text-muted font-medium">
                    {entry.totalTestCasesPassed}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-brand">
                    {entry.points}
                  </td>
                  <td className="px-6 py-4 text-right text-muted font-mono">
                    {formatTime(entry.firstSolveTime)}
                  </td>
                  <td className="px-6 py-4 text-right text-muted font-mono">
                    {entry.timePenalty}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

