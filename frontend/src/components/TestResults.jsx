import React from 'react';

export default function TestResults({ results, summary }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-main)]">🚀 Execution Results</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${results.every(r => r.passed) ? 'bg-[#2cbb5d]/10 text-[#2cbb5d]' : 'bg-[#ef4743]/10 text-[#ef4743]'}`}>
          {summary}
        </span>
      </div>
      
      <div className="space-y-3">
        {results.map((res, idx) => (
          <div 
            key={idx} 
            className={`lc-card p-3 border-l-4 ${res.passed ? 'border-l-[#2cbb5d]' : 'border-l-[#ef4743]'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Test Case #{idx + 1}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${res.passed ? 'text-[#2cbb5d]' : 'text-[#ef4743]'}`}>
                  {res.passed ? '✓ Passed' : '✗ Failed'}
                </span>
              </div>
            </div>
            
            {/* Details hidden for students for exam security */}
            {!res.passed && (
              <p className="mt-2 text-[9px] text-[var(--text-muted)] italic">
                Details are hidden to maintain exam integrity.
              </p>
            )}
          </div>
        ))}
      </div>
      
      <p className="mt-4 text-[10px] text-center text-[var(--text-muted)] italic">
        * Only public test cases are shown above. Final submission will include hidden cases.
      </p>
    </div>
  );
}
