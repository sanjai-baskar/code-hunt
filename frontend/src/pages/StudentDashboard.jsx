import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import ChatBot from '../components/ChatBot';


export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [problems, setProblems] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState('practice');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileClass, setProfileClass] = useState(user.class || '');
  const [profileYear, setProfileYear] = useState(user.year || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await api.patch('/student/profile', { class: profileClass, year: profileYear });
      const updatedUser = { ...user, class: res.data.class, year: res.data.year };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowProfileModal(false);
    } catch (e) {
      alert('Failed to save profile: ' + (e.response?.data?.error || e.response?.data?.details || e.message));
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [probRes, contRes] = await Promise.allSettled([
        api.get(`/problems?t=${Date.now()}`),
        api.get(`/contests?t=${Date.now()}`)
      ]);
      if (probRes.status === 'fulfilled') setProblems(probRes.value.data);
      if (contRes.status === 'fulfilled') setContests(contRes.value.data);
    } catch (e) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('focus', fetchData);
    return () => window.removeEventListener('focus', fetchData);
  }, []);

  if (loading) return (
    <div className="h-screen bg-background flex items-center justify-center transition-colors duration-300">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const categories = ['All', ...new Set(problems.map(p => p.category).filter(c => c && c !== 'All'))];
  const filteredProblems = activeCategory === 'All' 
    ? problems 
    : problems.filter(p => p.category === activeCategory);

  const solvedCount = problems.filter(p => p.isSolved).length;
  const progressPercent = problems.length > 0 ? (solvedCount / problems.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navbar */}
      <nav className="lc-navbar px-4 md:px-6 bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-6">
            <h1 className="text-base md:text-xl font-bold text-brand">Code Hunt</h1>
            <div className="hidden md:flex gap-4 text-sm text-muted">
              <span 
                className={`cursor-pointer font-medium ${viewMode === 'practice' ? 'text-foreground border-b-2 border-brand' : 'hover:text-foreground'}`}
                onClick={() => setViewMode('practice')}
              >
                Practice
              </span>
              <span 
                className={`cursor-pointer font-medium ${viewMode === 'contests' ? 'text-foreground border-b-2 border-brand' : 'hover:text-foreground'}`}
                onClick={() => setViewMode('contests')}
              >
                Contests
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile view toggle */}
            <div className="flex md:hidden gap-1 bg-background border border-border rounded-lg p-0.5">
              <button onClick={() => setViewMode('practice')} className={`px-2 py-1 text-[10px] font-bold rounded ${viewMode === 'practice' ? 'bg-brand text-white' : 'text-muted'}`}>Practice</button>
              <button onClick={() => setViewMode('contests')} className={`px-2 py-1 text-[10px] font-bold rounded ${viewMode === 'contests' ? 'bg-brand text-white' : 'text-muted'}`}>Contests</button>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground">{user.name}</p>
              <p className="text-[10px] text-muted">{user.email}</p>
              {(user.class || user.year) && (
                <p className="text-[10px] text-brand font-medium">{user.class}{user.class && user.year ? ' · ' : ''}{user.year}</p>
              )}
            </div>
            <button
              onClick={() => { setProfileClass(user.class || ''); setProfileYear(user.year || ''); setShowProfileModal(true); }}
              className="text-xs text-brand hover:text-brand/80 font-medium transition-colors"
            >
              Profile
            </button>
            <button 
              onClick={handleLogout}
              className="text-xs text-muted hover:text-red-500 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

<div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          <div className="lg:col-span-3">
            <div className="lc-card overflow-hidden border-border bg-surface">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border flex flex-col gap-3 md:gap-4 bg-surface">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-foreground text-sm md:text-base">Problem Set</h2>
                  <div className="flex gap-2 text-[10px] md:text-xs">
                    <span className="px-2 md:px-3 py-1 bg-background border border-border rounded-full text-muted">Difficulty ▾</span>
                    <span className="px-2 md:px-3 py-1 bg-background border border-border rounded-full text-muted">Status ▾</span>
                  </div>
                </div>
                
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`shrink-0 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all whitespace-nowrap border ${
                        activeCategory === cat 
                          ? 'bg-brand/10 text-brand border-brand/30' 
                          : 'bg-background text-muted border-border hover:border-muted'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="p-20 text-center">
                  <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : error ? (
                <div className="p-10 text-center text-red-400">{error}</div>
              ) : viewMode === 'practice' ? (
                <div className="bg-surface">
                  {filteredProblems.map((p, i) => (
                    <div 
                      key={p.id} 
                      className="problem-row border-b border-border hover:bg-background/50 cursor-pointer px-3 md:px-5 py-2 md:py-3"
                      onClick={() => navigate(`/challenge/${p.id}`)}
                    >
                      <div className="w-5 md:w-8 text-muted text-[10px] md:text-sm shrink-0">{i + 1}.</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs md:text-sm text-foreground hover:text-brand font-medium transition-colors truncate block">
                          {p.title}
                        </span>
                      </div>
                      <div className="w-14 md:w-24 text-center flex items-center justify-center gap-1 md:gap-2 shrink-0">
                        <span className={`badge-${p.difficulty.toLowerCase()} text-[9px] md:text-xs px-1.5 md:px-2.5`}>
                          {p.difficulty}
                        </span>
                      </div>
                      <div className="hidden sm:block w-20 md:w-24 text-right shrink-0">
                        {p.isSolved ? (
                          <span className="text-[10px] md:text-xs font-bold text-green-500 bg-green-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded">Solved ✅</span>
                        ) : (
                          <span className="text-[10px] md:text-xs text-brand hover:underline">Solve →</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredProblems.length === 0 && (
                    <div className="p-6 md:p-8 text-center text-muted text-sm">No problems found for {activeCategory}.</div>
                  )}
                </div>
              ) : (
                <div className="bg-surface p-3 md:p-4 space-y-3 md:space-y-4">
                  {contests.length === 0 ? (
                    <div className="p-6 md:p-8 text-center text-muted text-sm">No contests available at the moment.</div>
                  ) : (
                    contests.map((c) => {
                      const now = new Date();
                      const start = new Date(c.startTime);
                      const end = new Date(c.endTime);
                      let status = 'Upcoming';
                      let statusColor = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                      
                      if (now >= start && now <= end) {
                        status = 'Active';
                        statusColor = 'text-green-500 bg-green-500/10 border-green-500/20';
                      } else if (now > end) {
                        status = 'Past';
                        statusColor = 'text-gray-500 bg-gray-500/10 border-gray-500/20';
                      }

                      return (
                        <div key={c.id} className="lc-card p-4 md:p-5 border border-border hover:border-brand/50 transition-colors">
                          <div className="flex justify-between items-start mb-2 md:mb-3 gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm md:text-lg font-bold text-foreground hover:text-brand cursor-pointer truncate" onClick={() => navigate(`/contest/${c.id}`)}>
                                {c.title}
                              </h3>
                              <p className="text-[10px] md:text-xs text-muted mt-1">
                                {start.toLocaleString()} - {end.toLocaleString()}
                              </p>
                            </div>
                            <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                              {status}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-muted mb-3 md:mb-4 line-clamp-2">{c.description || 'No description available.'}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] md:text-xs font-medium text-foreground bg-background px-2 py-1 rounded shrink-0">
                              {c._count?.problems || 0} Challenges
                            </span>
                            <button 
                              onClick={() => navigate(`/contest/${c.id}`)}
                              className="text-[10px] md:text-xs bg-brand text-white px-3 md:px-4 py-1.5 rounded font-medium hover:bg-brand/80 transition-colors shrink-0"
                            >
                              {status === 'Active' ? 'Enter Contest' : status === 'Past' ? 'View Results' : 'View Details'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <div className="lc-card p-4 md:p-6 border-border bg-surface">
              <h3 className="font-bold text-foreground text-sm md:text-base mb-3 md:mb-4">My Status</h3>
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm text-muted">Solved</span>
                  <span className="text-base md:text-lg font-bold text-foreground">{solvedCount} / {problems.length}</span>
                </div>
                <div className="w-full bg-border h-1.5 md:h-2 rounded-full overflow-hidden">
                  <div className="bg-brand h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
            </div>

            <div className="lc-card p-4 md:p-6 border-border bg-gradient-to-br from-brand/10 to-transparent">
              <h3 className="font-bold text-brand text-sm md:text-base mb-2">AI Monitoring</h3>
              <p className="text-[10px] md:text-xs text-muted leading-relaxed">
                Stay focused! Our AI monitors your gaze. Copy/Paste actions are strictly prohibited.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="lc-card w-full max-w-md p-6 bg-surface border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-muted hover:text-foreground text-xl transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Class</label>
                <select
                  value={profileClass}
                  onChange={(e) => setProfileClass(e.target.value)}
                  className="w-full lc-input bg-input border-border text-foreground focus:border-brand"
                >
                  <option value="">Select Class</option>
                  <option value="BSC CS">BSC CS</option>
                  <option value="BSC AIML">BSC AIML</option>
                  <option value="BCA">BCA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Year</label>
                <select
                  value={profileYear}
                  onChange={(e) => setProfileYear(e.target.value)}
                  className="w-full lc-input bg-input border-border text-foreground focus:border-brand"
                >
                  <option value="">Select Year</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                </select>
              </div>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="w-full lc-btn-primary py-3 mt-2 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ChatBot */}
      <ChatBot />
    </div>
  );
}
