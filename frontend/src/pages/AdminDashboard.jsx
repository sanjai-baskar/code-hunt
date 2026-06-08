import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

import AdminProblemForm from '../components/AdminProblemForm';
import StudentLogsModal from '../components/StudentLogsModal';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [problems, setProblems] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('problems');
  const [showForm, setShowForm] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [webcamToggling, setWebcamToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use individual try-catches or allSettled to be more resilient
      const results = await Promise.allSettled([
        api.get('/problems'),
        api.get('/admin/students'),
        api.get('/admin/settings'),
      ]);

      if (results[0].status === 'fulfilled') setProblems(results[0].value.data);
      if (results[1].status === 'fulfilled') setStudents(results[1].value.data);
      if (results[2].status === 'fulfilled') setWebcamEnabled(results[2].value.data.webcamEnabled);

    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deleteProblem = async (id) => {
    if (!window.confirm('Delete this problem? All related submissions and logs will also be deleted.')) return;
    try {
      await api.delete(`/problems/${id}`);
      setProblems((prev) => prev.filter((p) => p.id !== id));
    } catch { alert('Failed to delete.'); }
  };

  const toggleWebcam = async () => {
    if (webcamToggling) return;
    const nextState = !webcamEnabled;
    
    setWebcamToggling(true);
    // Optimistic update
    setWebcamEnabled(nextState);
    
    try {
      const res = await api.post('/admin/settings/webcam', { webcamEnabled: nextState });
      // Sync with server response
      setWebcamEnabled(res.data.webcamEnabled);
    } catch (err) {
      // Rollback on error
      setWebcamEnabled(!nextState);
      alert('Failed to update webcam setting: ' + (err.response?.data?.error || err.message));
    } finally {
      setWebcamToggling(false);
    }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const DIFF_COLORS = {
    Easy: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    Medium: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    Hard: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  };

  if (loading) return (
    <div className="h-screen bg-background flex items-center justify-center transition-colors duration-300">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl"></span>
            <span className="text-xl font-bold text-foreground">Code<span className="text-brand">Hunt</span></span>
            <span className="ml-2 text-xs px-2.5 py-1 rounded-full font-medium bg-brand/10 text-brand border border-brand/20">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">

            <span className="text-sm text-foreground">{user.name}</span>
            <button id="admin-logout" onClick={logout}
              className="px-4 py-2 rounded-lg text-sm transition-all bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Admin Dashboard</h1>
          <p className="text-muted">Manage problems and monitor student activity.</p>
        </div>

        {/* ── Webcam Control Card ── */}
        <div className={`lc-card p-5 mb-8 flex items-center justify-between border ${webcamEnabled ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex items-center gap-4">
            <span className="text-3xl">{webcamEnabled ? '📷' : '🚫'}</span>
            <div>
              <p className="font-bold text-foreground text-lg">Webcam Monitoring</p>
              <p className="text-sm text-muted">
                {webcamEnabled
                  ? 'Webcam is ON — students must use the camera during exams.'
                  : 'Webcam is OFF — students can take exams without a camera.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleWebcam}
            disabled={webcamToggling}
            className={`relative inline-flex items-center h-8 w-16 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-60 ${webcamEnabled ? 'bg-green-500' : 'bg-red-500/60'}`}
          >
            <span className={`inline-block w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${webcamEnabled ? 'translate-x-9' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Problems', value: problems.length, icon: '📝' },
            { label: 'Students', value: students.length, icon: '👥' },
            { label: 'Total Solved', value: students.reduce((a, s) => a + (s.solvedCount || 0), 0), icon: '✅' },
            { label: 'Had Distractions', value: students.filter(s => s.hadDistraction).length, icon: '⚠️' },
          ].map((s) => (
            <div key={s.label} className="lc-card p-5 flex items-center gap-4 bg-surface border-border">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['problems', 'students'].map((tab) => (
            <button key={tab} id={`tab-${tab}`} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${activeTab === tab
                ? 'bg-brand/10 text-brand border-brand/30'
                : 'bg-surface text-muted border-border hover:bg-background'
              }`}>
              {tab === 'problems' ? '📝 Problems' : '👥 Students'}
            </button>
          ))}
        </div>

        {/* Problems Tab */}
        {activeTab === 'problems' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Coding Problems</h2>
              <button id="add-problem-btn" onClick={() => { setEditingProblem(null); setShowForm(true); }}
                className="lc-btn-primary px-4 py-2 text-sm !py-2">
                + Add Problem
              </button>
            </div>

            <div className="bg-surface border-border border rounded-xl overflow-hidden">
              {problems.map((p) => (
                <div key={p.id} className="p-4 border-b border-border flex items-center justify-between hover:bg-background/50 transition-colors">
                  <div>
                    <p className="text-foreground font-bold mb-1">{p.title}</p>
                    <div className="flex gap-2 items-center">
                      <span className={`badge-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">{p.category || 'All'}</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => { setEditingProblem(p); setShowForm(true); }} className="text-muted hover:text-foreground text-sm font-medium transition-colors">Edit</button>
                    <button onClick={() => deleteProblem(p.id)} className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors">Delete</button>
                  </div>
                </div>
              ))}
              {problems.length === 0 && (
                <div className="p-8 text-center text-muted">No problems created yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Registered Students</h2>
            <div className="space-y-3">
              {students.map((s) => (
                <div key={s.id} className="lc-card p-5 border-border bg-surface">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <p className="text-foreground font-bold">{s.name}</p>
                        {/* Distraction Badge */}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.hadDistraction ? 'bg-red-500/15 text-red-500' : 'bg-green-500/15 text-green-500'}`}>
                          {s.hadDistraction ? `⚠️ ${s.totalDistractions} distraction${s.totalDistractions !== 1 ? 's' : ''}` : '✅ Clean'}
                        </span>
                      </div>
                      <p className="text-sm text-muted mb-3">{s.email}</p>

                      {/* Solved Problems */}
                      <div>
                        <p className="text-xs text-muted font-bold uppercase tracking-wider mb-2">
                          Solved {s.solvedCount} problem{s.solvedCount !== 1 ? 's' : ''}
                        </p>
                        {s.solvedCount > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {s.solvedProblems.map(sub => (
                              <span
                                key={sub.id}
                                style={{ background: DIFF_COLORS[sub.problem.difficulty]?.bg, color: DIFF_COLORS[sub.problem.difficulty]?.color }}
                                className="text-xs px-2.5 py-1 rounded-full font-medium border border-current/20"
                              >
                                {sub.problem.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted italic">No problems solved yet.</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className="bg-background border border-border text-foreground text-sm px-4 py-2 rounded hover:border-brand transition-colors font-medium shrink-0"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <div className="p-8 text-center text-muted lc-card bg-surface border-border">No students registered yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Problem Form Modal */}
      {showForm && (
        <AdminProblemForm
          problem={editingProblem}
          onClose={() => { setShowForm(false); setEditingProblem(null); }}
          onSaved={() => { setShowForm(false); setEditingProblem(null); fetchData(); }}
        />
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentLogsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
