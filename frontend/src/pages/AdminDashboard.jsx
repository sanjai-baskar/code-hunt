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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/problems'),
        api.get('/admin/students'),
      ]);
      setProblems(pRes.data);
      setStudents(sRes.data);
    } catch (e) {
      console.error(e);
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

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const DIFF_COLORS = {
    Easy:   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
    Medium: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    Hard:   { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Problems', value: problems.length, icon: '📝' },
            { label: 'Students', value: students.length, icon: '👥' },
            { label: 'Total Logs', value: students.reduce((a, s) => a + (s._count?.distractionLogs || 0), 0), icon: '👁️' },
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
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                activeTab === tab 
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
              {loading ? (
                <div className="p-8 text-center text-muted">Loading...</div>
              ) : (
                <>
                  {problems.map((p) => (
                    <div key={p.id} className="p-4 border-b border-border flex items-center justify-between hover:bg-background/50 transition-colors">
                      <div>
                        <p className="text-foreground font-bold mb-1">{p.title}</p>
                        <span className={`badge-${p.difficulty.toLowerCase()}`}>
                          {p.difficulty}
                        </span>
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
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Registered Students</h2>
            <div className="space-y-3">
              {students.map((s) => (
                <div key={s.id} className="lc-card p-5 flex items-center justify-between bg-surface border-border">
                  <div>
                    <p className="text-foreground font-bold">
                      {s.name} {s.hasPassed && <span title="Passed all test cases" className="ml-1 text-brand">❓</span>}
                    </p>
                    <p className="text-sm text-muted">{s.email}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-xs font-bold text-brand">{s._count?.submissions || 0} submissions</span>
                      <span className="text-xs font-bold text-red-500">{s._count?.distractionLogs || 0} distraction events</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStudent(s)} className="bg-background border border-border text-foreground text-sm px-4 py-2 rounded hover:border-brand transition-colors font-medium">
                    View Logs
                  </button>
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

      {/* Student Logs Modal */}
      {selectedStudent && (
        <StudentLogsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
