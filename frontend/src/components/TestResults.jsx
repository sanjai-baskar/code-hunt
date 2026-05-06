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
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Test Case #{idx + 1}</span>
              <span className={`text-[10px] font-bold uppercase ${res.passed ? 'text-[#2cbb5d]' : res.expected ? 'text-[#ef4743]' : 'text-[#ffa116]'}`}>
                {res.passed ? 'Passed' : res.expected ? 'Failed' : 'Executed'}
              </span>
            </div>
            
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex">
                <span className="w-16 text-[var(--text-muted)] shrink-0">Input:</span>
                <span className="text-[#ffa116] truncate whitespace-pre-wrap">{res.input}</span>
              </div>
              <div className="flex">
                <span className="w-16 text-[var(--text-muted)] shrink-0">Expected:</span>
                <span className="text-[var(--text-main)] whitespace-pre-wrap">{res.expected}</span>
              </div>
              <div className="flex">
                <span className="w-16 text-[var(--text-muted)] shrink-0">Actual:</span>
                <span className={`whitespace-pre-wrap ${res.passed ? 'text-[#2cbb5d]' : res.expected ? 'text-[#ef4743]' : 'text-[var(--text-main)]'}`}>{res.actual}</span>
              </div>
            </div>

            {res.logs && res.logs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border-main)]">
                <p className="text-[9px] text-[var(--text-muted)] uppercase font-bold mb-1">Console Logs:</p>
                <div className="bg-[var(--bg-dark)] border border-[var(--border-main)] p-2 rounded text-[10px] text-[var(--text-main)] font-mono max-h-24 overflow-y-auto">
                  {res.logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
