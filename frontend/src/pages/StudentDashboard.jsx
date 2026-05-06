import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/problems')
      .then(({ data }) => setProblems(data))
      .catch(() => setError('Failed to load problems.'))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      {/* Navbar */}
      <nav className="lc-navbar">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-[#ffa116]">Code Hunt</h1>
            <div className="hidden md:flex gap-4 text-sm text-[var(--text-muted)]">
              <span className="text-[var(--text-main)] cursor-pointer font-medium">Problems</span>
              <span className="hover:text-[var(--text-main)] cursor-pointer">Contests</span>
              <span className="hover:text-[var(--text-main)] cursor-pointer">Discuss</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[var(--text-main)]">{user.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="text-xs text-[var(--text-muted)] hover:text-[#ef4743] font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="lc-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-card)]">
                <h2 className="font-bold text-[var(--text-main)]">Problem Set</h2>
                <div className="flex gap-2 text-xs">
                  <span className="px-3 py-1 bg-[var(--bg-dark)] border border-[var(--border-main)] rounded-full text-[var(--text-muted)]">Difficulty ▾</span>
                  <span className="px-3 py-1 bg-[var(--bg-dark)] border border-[var(--border-main)] rounded-full text-[var(--text-muted)]">Status ▾</span>
                </div>
              </div>

              {loading ? (
                <div className="p-20 text-center">
                  <div className="w-10 h-10 border-4 border-[#ffa116] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : error ? (
                <div className="p-10 text-center text-red-400">{error}</div>
              ) : (
                <div className="bg-[var(--bg-card)]">
                  {problems.map((p, i) => (
                    <div 
                      key={p.id} 
                      className="problem-row"
                      onClick={() => navigate(`/challenge/${p.id}`)}
                    >
                      <div className="w-8 text-[var(--text-muted)] text-sm">{i + 1}.</div>
                      <div className="flex-1">
                        <span className="text-[var(--text-main)] hover:text-[#ffa116] font-medium transition-colors">
                          {p.title}
                        </span>
                      </div>
                      <div className="w-24 text-center">
                        <span className={`badge-${p.difficulty.toLowerCase()}`}>
                          {p.difficulty}
                        </span>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-xs text-[#2cbb5d]">Solve →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="lc-card p-6">
              <h3 className="font-bold text-[var(--text-main)] mb-4">My Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-muted)]">Solved</span>
                  <span className="text-lg font-bold text-[var(--text-main)]">0 / {problems.length}</span>
                </div>
                <div className="w-full bg-[var(--border-main)] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ffa116] h-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>

            <div className="lc-card p-6 bg-gradient-to-br from-[#ffa116]/10 to-transparent">
              <h3 className="font-bold text-[#ffa116] mb-2">AI Monitoring</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Stay focused! Our AI monitors your gaze. Looking away for 10s logs a distraction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
