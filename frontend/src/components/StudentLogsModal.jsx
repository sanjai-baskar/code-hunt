import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function StudentLogsModal({ student, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/student/${student.id}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [student.id]);

  const diffColor = {
    Easy: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    Medium: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    Hard: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="lc-card w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface border-border animate-fade-in">

        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
            <p className="text-sm text-muted">{student.email}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── Distraction Summary ── */}
            <div className="lc-card p-5 border-border bg-background">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Proctoring Summary</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${data.hadDistraction ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                  {data.hadDistraction ? '⚠️ Had Distractions' : '✅ Clean Session'}
                </div>
                {data.hadDistraction && (
                  <div className="text-sm text-muted">
                    <span className="font-bold text-foreground text-lg">{data.totalDistractions}</span> total distraction event{data.totalDistractions !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Per-problem distraction breakdown */}
              {data.distractionSummaries?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Per Problem</p>
                  {data.distractionSummaries.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-surface rounded-lg px-3 py-2 border border-border">
                      <span className="text-foreground font-medium">{d.problem?.title || d.problemId}</span>
                      <span className={`text-xs font-bold ${d.hadDistraction ? 'text-red-500' : 'text-green-500'}`}>
                        {d.hadDistraction ? `⚠️ ${d.distractionCount} event${d.distractionCount !== 1 ? 's' : ''}` : '✅ Clean'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Solved Problems ── */}
            <div className="lc-card p-5 border-border bg-background">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">
                Solved Problems ({data.solvedProblems?.length || 0})
              </p>
              {data.solvedProblems?.length > 0 ? (
                <div className="space-y-2">
                  {data.solvedProblems.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-green-500 font-bold">✓</span>
                        <span className="font-medium text-foreground text-sm">{sub.problem.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: diffColor[sub.problem.difficulty]?.bg, color: diffColor[sub.problem.difficulty]?.color }}
                        >
                          {sub.problem.difficulty}
                        </span>
                        <span className="text-xs text-muted">{new Date(sub.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted italic text-center py-4">No problems solved yet.</p>
              )}
            </div>

            {/* ── All Submissions ── */}
            <div className="lc-card p-5 border-border bg-background">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">
                All Submissions ({data.submissions?.length || 0})
              </p>
              {data.submissions?.length > 0 ? (
                <div className="space-y-2">
                  {data.submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3">
                      <span className="font-medium text-foreground text-sm">{sub.problem.title}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sub.passedTestCases ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}`}>
                          {sub.passedTestCases ? 'Passed' : 'Failed'}
                        </span>
                        <span className="text-xs text-muted">{new Date(sub.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted italic text-center py-4">No submissions yet.</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
