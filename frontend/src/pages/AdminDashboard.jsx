import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../api/client';

import AdminProblemForm from '../components/AdminProblemForm';
import AdminContestForm from '../components/AdminContestForm';
import StudentLogsModal from '../components/StudentLogsModal';
import Leaderboard from '../components/Leaderboard';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [problems, setProblems] = useState([]);
  const [contests, setContests] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('problems');
  const [showForm, setShowForm] = useState(false);
  const [showContestForm, setShowContestForm] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [editingContest, setEditingContest] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedLeaderboardContest, setSelectedLeaderboardContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [webcamToggling, setWebcamToggling] = useState(false);
  const [yearFilter, setYearFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get(`/problems?t=${Date.now()}`),
        api.get(`/admin/students?t=${Date.now()}${yearFilter ? `&year=${yearFilter}` : ''}`),
        api.get(`/admin/settings?t=${Date.now()}`),
        api.get(`/contests?t=${Date.now()}`),
      ]);

      if (results[0].status === 'fulfilled') setProblems(results[0].value.data);
      if (results[1].status === 'fulfilled') setStudents(results[1].value.data);
      if (results[2].status === 'fulfilled') setWebcamEnabled(results[2].value.data.webcamEnabled);
      if (results[3].status === 'fulfilled') setContests(results[3].value.data);

    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [yearFilter]);

  useEffect(() => { 
    fetchData(); 
    window.addEventListener('focus', fetchData);
    return () => window.removeEventListener('focus', fetchData);
  }, [fetchData]);

  const deleteProblem = async (id) => {
    if (!window.confirm('Delete this problem? All related submissions and logs will also be deleted.')) return;
    try {
      await api.delete(`/problems/${id}`);
      setProblems((prev) => prev.filter((p) => p.id !== id));
    } catch { alert('Failed to delete.'); }
  };

  const deleteContest = async (id) => {
    if (!window.confirm('Delete this contest? All related data will be lost.')) return;
    try {
      await api.delete(`/admin/contests/${id}`);
      setContests((prev) => prev.filter((c) => c.id !== id));
    } catch { alert('Failed to delete contest.'); }
  };

  const toggleWebcam = async () => {
    if (webcamToggling) return;
    const nextState = !webcamEnabled;
    
    setWebcamToggling(true);
    setWebcamEnabled(nextState);
    
    try {
      const res = await api.post('/admin/settings/webcam', { webcamEnabled: nextState });
      setWebcamEnabled(res.data.webcamEnabled);
    } catch (err) {
      setWebcamEnabled(!nextState);
      alert('Failed to update webcam setting: ' + (err.response?.data?.error || err.message));
    } finally {
      setWebcamToggling(false);
    }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const downloadStudentsExcel = () => {
    if (students.length === 0) {
      alert('No student data to download.');
      return;
    }
    const rows = students.map((s, idx) => ({
      'S.No': idx + 1,
      'Name': s.name,
      'Email': s.email,
      'Class': s.class || '',
      'Year': s.year || '',
      'Solved Problems': s.solvedCount,
      'Total Distractions': s.totalDistractions,
      'Had Distraction': s.hadDistraction ? 'Yes' : 'No',
      'Registered On': new Date(s.createdAt).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students Summary');
    const colWidths = [
      { wch: 6 }, { wch: 22 }, { wch: 30 }, { wch: 14 },
      { wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    ];
    ws['!cols'] = colWidths;
    XLSX.writeFile(wb, `students_summary_${yearFilter || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadDailyReportExcel = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await api.get(`/admin/daily-report${yearFilter ? `?year=${yearFilter}` : ''}`);
      const { submissions = [], distractionSummaries = [] } = res.data || {};

      const wb = XLSX.utils.book_new();

      // Sheet 1: Master Student List & Progress
      const studentRows = students.map((s, idx) => ({
        'S.No': idx + 1,
        'Student Name': s.name,
        'Email': s.email,
        'Class': s.class || '',
        'Year': s.year || '',
        'Solved Count': s.solvedCount,
        'Total Distractions': s.totalDistractions,
        'Had Distraction': s.hadDistraction ? 'Yes' : 'No',
        'Registered Date': new Date(s.createdAt).toLocaleDateString(),
      }));
      const wsStudents = XLSX.utils.json_to_sheet(studentRows);
      wsStudents['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 28 }, { wch: 12 },
        { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, wsStudents, 'Student Master');

      // Sheet 2: Daily Submissions Detail
      const subRows = submissions.map((sub, idx) => ({
        'S.No': idx + 1,
        'Date & Time': new Date(sub.timestamp).toLocaleString(),
        'Student Name': sub.student?.name || '',
        'Email': sub.student?.email || '',
        'Class': sub.student?.class || '',
        'Year': sub.student?.year || '',
        'Problem Title': sub.problem?.title || '',
        'Difficulty': sub.problem?.difficulty || '',
        'Status': sub.passedTestCases ? 'PASSED ✅' : 'FAILED ❌',
        'Distraction Count': sub.distractionCount || 0,
      }));
      const wsSubmissions = XLSX.utils.json_to_sheet(subRows.length > 0 ? subRows : [{ 'Message': 'No submissions recorded yet.' }]);
      wsSubmissions['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 28 },
        { wch: 10 }, { wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSubmissions, 'Daily Submissions');

      // Sheet 3: Proctor Warning Logs / Distraction Summaries
      const logRows = distractionSummaries.map((d, idx) => ({
        'S.No': idx + 1,
        'Last Activity': new Date(d.lastUpdated).toLocaleString(),
        'Student Name': d.student?.name || '',
        'Email': d.student?.email || '',
        'Class': d.student?.class || '',
        'Year': d.student?.year || '',
        'Problem Title': d.problem?.title || '',
        'Had Distraction': d.hadDistraction ? 'Yes' : 'No',
        'Distraction Events': d.distractionCount || 0,
      }));
      const wsLogs = XLSX.utils.json_to_sheet(logRows.length > 0 ? logRows : [{ 'Message': 'No proctor warning events recorded.' }]);
      wsLogs['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 22 }, { wch: 28 },
        { wch: 10 }, { wch: 8 }, { wch: 25 }, { wch: 16 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsLogs, 'Proctor Warnings');

      XLSX.writeFile(wb, `students_daily_report_${todayStr}.xlsx`);
    } catch (err) {
      console.error('Failed to download daily report:', err);
      alert('Failed to generate daily report. Standard export will be downloaded instead.');
      downloadStudentsExcel();
    }
  };


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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xl md:text-2xl"></span>
            <span className="text-base md:text-xl font-bold text-foreground">Code<span className="text-brand">Hunt</span></span>
            <span className="ml-1 md:ml-2 text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full font-medium bg-brand/10 text-brand border border-brand/20">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-foreground hidden sm:block">{user.name}</span>
            <button id="admin-logout" onClick={logout}
              className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm transition-all bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted">Manage problems and monitor student activity.</p>
        </div>

        {/* Webcam Toggle */}
        <div className={`lc-card p-4 md:p-5 mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border ${webcamEnabled ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-2xl md:text-3xl">{webcamEnabled ? '📷' : '🚫'}</span>
            <div>
              <p className="font-bold text-foreground text-base md:text-lg">Webcam Monitoring</p>
              <p className="text-xs md:text-sm text-muted">
                {webcamEnabled
                  ? 'Webcam is ON — students must use the camera during exams.'
                  : 'Webcam is OFF — students can take exams without a camera.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleWebcam}
            disabled={webcamToggling}
            className={`relative inline-flex items-center h-7 md:h-8 w-14 md:w-16 rounded-full shrink-0 transition-all duration-300 focus:outline-none disabled:opacity-60 ${webcamEnabled ? 'bg-green-500' : 'bg-red-500/60'}`}
          >
            <span className={`inline-block w-5 md:w-6 h-5 md:h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${webcamEnabled ? 'translate-x-8 md:translate-x-9' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: 'Total Problems', value: problems.length, icon: '📝' },
            { label: 'Students', value: students.length, icon: '👥' },
            { label: 'Total Solved', value: students.reduce((a, s) => a + (s.solvedCount || 0), 0), icon: '✅' },
            { label: 'Had Distractions', value: students.filter(s => s.hadDistraction).length, icon: '⚠️' },
          ].map((s) => (
            <div key={s.label} className="lc-card p-3 md:p-5 flex items-center gap-3 md:gap-4 bg-surface border-border">
              <span className="text-2xl md:text-3xl">{s.icon}</span>
              <div>
                <p className="text-xl md:text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] md:text-sm text-muted">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 md:gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {['problems', 'contests', 'students', 'leaderboard'].map((tab) => (
            <button key={tab} id={`tab-${tab}`} onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium capitalize transition-all border ${activeTab === tab
                ? 'bg-brand/10 text-brand border-brand/30'
                : 'bg-surface text-muted border-border hover:bg-background'
              }`}>
              {tab === 'problems' ? '📝 Problems' : tab === 'contests' ? '🏆 Contests' : tab === 'students' ? '👥 Students' : '🏅 Leaderboard'}
            </button>
          ))}
        </div>

        {/* Problems Tab */}
        {activeTab === 'problems' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Coding Problems</h2>
              <button id="add-problem-btn" onClick={() => { setEditingProblem(null); setShowForm(true); }}
                className="lc-btn-primary px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm">
                + Add Problem
              </button>
            </div>

            <div className="bg-surface border-border border rounded-xl overflow-hidden">
              {problems.map((p) => (
                <div key={p.id} className="p-3 md:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-background/50 transition-colors">
                  <div>
                    <p className="text-foreground font-bold text-sm md:text-base mb-1">{p.title}</p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={`badge-${p.difficulty.toLowerCase()} text-[10px] md:text-xs`}>{p.difficulty}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">{p.category || 'All'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 md:gap-4 ml-0 sm:ml-4">
                    <button onClick={() => { setEditingProblem(p); setShowForm(true); }} className="text-muted hover:text-foreground text-xs md:text-sm font-medium transition-colors">Edit</button>
                    <button onClick={() => deleteProblem(p.id)} className="text-red-500 hover:text-red-400 text-xs md:text-sm font-medium transition-colors">Delete</button>
                  </div>
                </div>
              ))}
              {problems.length === 0 && (
                <div className="p-8 text-center text-muted">No problems created yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Contests Tab */}
        {activeTab === 'contests' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Contests</h2>
              <button id="add-contest-btn" onClick={() => { setEditingContest(null); setShowContestForm(true); }}
                className="lc-btn-primary px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm">
                + Add Contest
              </button>
            </div>

            <div className="bg-surface border-border border rounded-xl overflow-hidden">
              {contests.map((c) => (
                <div key={c.id} className="p-3 md:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-background/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-foreground font-bold text-sm md:text-base mb-1">{c.title}</p>
                    <p className="text-[10px] md:text-xs text-muted mb-1">
                      {new Date(c.startTime).toLocaleString()} - {new Date(c.endTime).toLocaleString()}
                    </p>
                    <p className="text-xs md:text-sm text-muted mb-1 line-clamp-2">{c.description || 'No description available.'}</p>
                    <p className="text-[10px] md:text-xs text-brand font-medium">
                      {c._count?.problems || 0} Problems
                    </p>
                  </div>
                  <div className="flex gap-3 md:gap-4 ml-0 sm:ml-4 shrink-0">
                    <button onClick={() => { setEditingContest(c); setShowContestForm(true); }} className="text-blue-500 hover:text-blue-400 text-xs md:text-sm font-medium transition-colors">Edit</button>
                    <button onClick={() => deleteContest(c.id)} className="text-red-500 hover:text-red-400 text-xs md:text-sm font-medium transition-colors">Delete</button>
                  </div>
                </div>
              ))}
              {contests.length === 0 && (
                <div className="p-8 text-center text-muted">No contests created yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Registered Students</h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                <button
                  id="download-daily-report-btn"
                  onClick={downloadDailyReportExcel}
                  className="lc-btn-primary flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-green-600 hover:bg-green-500 shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  📊 Daily Report Excel
                </button>
                <button
                  id="download-excel-btn"
                  onClick={downloadStudentsExcel}
                  className="lc-btn-secondary flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm"
                >
                  Student Summary
                </button>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="lc-input bg-input border-border text-foreground focus:border-brand text-xs md:text-sm px-3 py-2 rounded-lg w-full sm:w-auto"
                >
                  <option value="">All Years</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {students.map((s) => (
                <div key={s.id} className="lc-card p-4 md:p-5 border-border bg-surface">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                        <p className="text-foreground font-bold text-sm md:text-base">{s.name}</p>
                        {(s.class || s.year) && (
                          <span className="text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                            {s.class}{s.class && s.year ? ' · ' : ''}{s.year}
                          </span>
                        )}
                        <span className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full ${s.hadDistraction ? 'bg-red-500/15 text-red-500' : 'bg-green-500/15 text-green-500'}`}>
                          {s.hadDistraction ? `⚠️ ${s.totalDistractions}` : '✅ Clean'}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-muted mb-3 break-all">{s.email}</p>

                      <div>
                        <p className="text-[10px] md:text-xs text-muted font-bold uppercase tracking-wider mb-2">
                          Solved {s.solvedCount} problem{s.solvedCount !== 1 ? 's' : ''}
                        </p>
                        {s.solvedCount > 0 ? (
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {s.solvedProblems.map(sub => (
                              <span
                                key={sub.id}
                                style={{ background: DIFF_COLORS[sub.problem.difficulty]?.bg, color: DIFF_COLORS[sub.problem.difficulty]?.color }}
                                className="text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full font-medium border border-current/20"
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
                      className="bg-background border border-border text-foreground text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded hover:border-brand transition-colors font-medium shrink-0 w-full sm:w-auto"
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

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Contest Leaderboards</h2>
            
            <div className="mb-6">
              <p className="text-sm text-muted mb-3">Select a contest to view leaderboard:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {contests.length === 0 ? (
                  <p className="text-sm text-muted col-span-full">No contests available.</p>
                ) : (
                  contests.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedLeaderboardContest(c.id)}
                      className={`p-3 md:p-4 text-left rounded-lg border transition-all ${
                        selectedLeaderboardContest === c.id
                          ? 'border-brand bg-brand/10'
                          : 'border-border bg-surface hover:border-brand/50'
                      }`}
                    >
                      <p className="font-bold text-foreground text-sm md:text-base">{c.title}</p>
                      <p className="text-[10px] md:text-xs text-muted mt-1">
                        {new Date(c.startTime).toLocaleString()}
                      </p>
                      <p className="text-[10px] md:text-xs text-brand font-medium mt-1">
                        {c._count?.problems || 0} Problems
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedLeaderboardContest && (
              <div>
                <Leaderboard contestId={selectedLeaderboardContest} />
              </div>
            )}
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

      {/* Contest Form Modal */}
      {showContestForm && (
        <AdminContestForm
          contest={editingContest}
          problems={problems}
          onClose={() => { setShowContestForm(false); setEditingContest(null); }}
          onSaved={() => { setShowContestForm(false); setEditingContest(null); fetchData(); }}
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
