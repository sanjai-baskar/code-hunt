import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Leaderboard from '../components/Leaderboard';

export default function ContestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('problems'); // 'problems' or 'leaderboard'
  const [timeRemaining, setTimeRemaining] = useState('');
  const [status, setStatus] = useState('Upcoming');

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const res = await api.get(`/contests/${id}`);
        setContest(res.data);
      } catch (err) {
        setError('Failed to load contest details.');
      } finally {
        setLoading(false);
      }
    };
    fetchContest();
  }, [id]);

  useEffect(() => {
    if (!contest) return;

    const updateTimer = () => {
      const now = new Date();
      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);

      if (now < start) {
        setStatus('Upcoming');
        setTimeRemaining(formatDuration(start - now));
      } else if (now >= start && now <= end) {
        setStatus('Active');
        setTimeRemaining(formatDuration(end - now));
      } else {
        setStatus('Past');
        setTimeRemaining('Contest Ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  const formatDuration = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error || !contest) return (
    <div className="h-screen bg-background flex items-center justify-center text-red-500 font-bold">
      {error || 'Contest not found'}
    </div>
  );

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navbar */}
      <nav className="lc-navbar px-4 md:px-6 bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-6">
            <button onClick={() => navigate('/dashboard')} className="text-muted hover:text-foreground mr-2">← Back</button>
            <h1 className="text-lg md:text-xl font-bold text-foreground">{contest.title}</h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-foreground">{user.name}</p>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Contest Header */}
        <div className="lc-card p-6 mb-8 border border-border bg-surface flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{contest.title}</h2>
            <p className="text-sm text-muted">{contest.description}</p>
          </div>
          <div className="text-center md:text-right bg-background p-4 rounded-lg border border-border min-w-[200px]">
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
              status === 'Active' ? 'text-green-500' : status === 'Upcoming' ? 'text-yellow-500' : 'text-gray-500'
            }`}>
              {status === 'Upcoming' ? 'Starts In' : status === 'Active' ? 'Ends In' : 'Status'}
            </p>
            <p className="text-2xl font-mono font-bold text-foreground">{timeRemaining}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['problems', 'leaderboard'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all border ${activeTab === tab
                ? 'bg-brand/10 text-brand border-brand/30'
                : 'bg-surface text-muted border-border hover:bg-background'
              }`}>
              {tab === 'problems' ? '📝 Challenges' : '🏆 Leaderboard'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'problems' && (
          <div>
            {status === 'Upcoming' ? (
              <div className="lc-card p-12 text-center border border-border bg-surface">
                <span className="text-4xl block mb-4">⏳</span>
                <h3 className="text-xl font-bold text-foreground mb-2">Contest hasn't started yet!</h3>
                <p className="text-muted">The challenges will be revealed once the countdown reaches zero.</p>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                {contest.problems && contest.problems.length > 0 ? (
                  contest.problems.map((p, i) => (
                    <div 
                      key={p.id} 
                      className="problem-row border-b border-border hover:bg-background/50 cursor-pointer p-4 flex items-center justify-between"
                      onClick={() => navigate(`/challenge/${p.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-muted font-bold w-6">{String.fromCharCode(65 + i)}</span>
                        <span className="text-base text-foreground hover:text-brand font-medium transition-colors">
                          {p.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`badge-${p.difficulty.toLowerCase()} text-xs`}>
                          {p.difficulty}
                        </span>
                        <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full border border-brand/20">
                          {p.points} Pts
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted">No problems available for this contest.</div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard contestId={contest.id} />
        )}
      </div>
    </div>
  );
}
