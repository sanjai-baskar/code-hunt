import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function StudentLogsModal({ student, onClose }) {
  const [data, setData] = useState({ student: null, submissions: [], distractionLogs: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('distractions');

  useEffect(() => {
    api.get(`/admin/student/${student.id}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [student.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="lc-card w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--bg-dark)] animate-fade-in">
        <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between shrink-0 bg-[var(--bg-card)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">{student.name}'s Logs</h2>
            <p className="text-sm text-[var(--text-muted)]">{student.email}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xl">✕</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex border-b border-[var(--border-main)] shrink-0 bg-[var(--bg-card)]">
              <button 
                onClick={() => setTab('distractions')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'distractions' ? 'text-[#ffa116] border-b-2 border-[#ffa116]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                Distraction Events ({data.distractionLogs.length})
              </button>
              <button 
                onClick={() => setTab('submissions')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'submissions' ? 'text-[#ffa116] border-b-2 border-[#ffa116]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                Submissions ({data.submissions.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'distractions' ? (
                <div>
                  {data.distractionLogs.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-10">No distractions recorded. Great focus!</div>
                  ) : (
                    data.distractionLogs.map((log) => (
                      <div key={log.id} className="mb-6 p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[#ef4743] font-bold text-sm">⚠️ Looking {log.direction}</span>
                          <span className="text-xs text-[var(--text-muted)]">{new Date(log.startTime).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-2 uppercase font-bold tracking-wider">Code Snapshot at time of distraction:</p>
                        <pre className="bg-[var(--bg-dark)] border border-[var(--border-main)] p-3 rounded text-[11px] text-[var(--text-main)] font-mono overflow-x-auto">
                          {log.codeSnapshot || '// No code written yet'}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.submissions.map(sub => (
                    <div key={sub.id} className="p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)]">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-bold text-[var(--text-main)]">{sub.problem.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sub.passedTestCases ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                          {sub.passedTestCases ? 'All Passed' : 'Failed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)] mb-3">
                        <span>📅 {new Date(sub.timestamp).toLocaleDateString()}</span>
                      </div>
                      <pre className="bg-[var(--bg-dark)] p-3 rounded text-[11px] font-mono text-[var(--text-main)] overflow-x-auto max-h-32 border border-[var(--border-main)]">
                        {sub.code}
                      </pre>
                    </div>
                  ))}
                  {data.submissions.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-[var(--text-muted)] italic">No submissions yet</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
