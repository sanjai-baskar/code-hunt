import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';


export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  useEffect(() => {
    api.get('/problems')
      .then(({ data }) => setProblems(data))
      .catch(() => setError('Failed to load problems.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-screen bg-background flex items-center justify-center transition-colors duration-300">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navbar */}
      <nav className="lc-navbar px-4 md:px-6 bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-6">
            <h1 className="text-lg md:text-xl font-bold text-brand">Code Hunt</h1>
            <div className="hidden md:flex gap-4 text-sm text-muted">
              <span className="text-foreground cursor-pointer font-medium">Problems</span>
              <span className="hover:text-foreground cursor-pointer">Contests</span>
              <span className="hover:text-foreground cursor-pointer">Discuss</span>
            </div>
          </div>
          <div className="flex items-center gap-4">

            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground">{user.name}</p>
              <p className="text-[10px] text-muted">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-xs text-muted hover:text-red-500 font-medium transition-colors"
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
            <div className="lc-card overflow-hidden border-border bg-surface">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
                <h2 className="font-bold text-foreground">Problem Set</h2>
                <div className="flex gap-2 text-xs">
                  <span className="px-3 py-1 bg-background border border-border rounded-full text-muted">Difficulty ▾</span>
                  <span className="px-3 py-1 bg-background border border-border rounded-full text-muted">Status ▾</span>
                </div>
              </div>

              {loading ? (
                <div className="p-20 text-center">
                  <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : error ? (
                <div className="p-10 text-center text-red-400">{error}</div>
              ) : (
                <div className="bg-surface">
                  {problems.map((p, i) => (
                    <div 
                      key={p.id} 
                      className="problem-row border-b border-border hover:bg-background/50 cursor-pointer"
                      onClick={() => navigate(`/challenge/${p.id}`)}
                    >
                      <div className="w-6 md:w-8 text-muted text-[10px] md:text-sm">{i + 1}.</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs md:text-sm text-foreground hover:text-brand font-medium transition-colors truncate block">
                          {p.title}
                        </span>
                      </div>
                      <div className="w-16 md:w-24 text-center">
                        <span className={`badge-${p.difficulty.toLowerCase()} text-[10px] md:text-xs`}>
                          {p.difficulty}
                        </span>
                      </div>
                      <div className="hidden sm:block w-20 text-right">
                        <span className="text-xs text-green-500">Solve →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="lc-card p-6 border-border bg-surface">
              <h3 className="font-bold text-foreground mb-4">My Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Solved</span>
                  <span className="text-lg font-bold text-foreground">0 / {problems.length}</span>
                </div>
                <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                  <div className="bg-brand h-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>

            <div className="lc-card p-6 border-border bg-gradient-to-br from-brand/10 to-transparent">
              <h3 className="font-bold text-brand mb-2">AI Monitoring</h3>
              <p className="text-xs text-muted leading-relaxed">
                Stay focused! Our AI monitors your gaze. Copy/Paste actions are strictly prohibited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
