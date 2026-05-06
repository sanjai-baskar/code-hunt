import React from 'react';

export default function TestResults({ results, summary }) {
  if (!results) return null;

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground">🚀 Execution Results</h3>
        <span className="text-xs font-mono bg-surface px-2 py-1 rounded border border-border text-foreground">
          {summary.passed} / {summary.total} Passed
        </span>
      </div>

      <div className="space-y-3">
        {results.map((res, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded-lg border text-sm ${
              res.passed ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-tighter">Test Case #{idx + 1}</span>
              <span className={res.passed ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                {res.passed ? '✅ Passed' : '❌ Failed'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <span className="block text-[10px] opacity-70 mb-1">Input:</span>
                <code className="text-foreground bg-black/20 dark:bg-black/50 px-1.5 py-0.5 rounded">{res.input}</code>
                <p className="mt-2 text-[9px] text-muted italic">
                  Exec Time: {res.executionTime}ms
                </p>
              </div>
              <div>
                <span className="block text-[10px] opacity-70 mb-1">Output:</span>
                <code className={res.passed ? 'text-green-500' : 'text-red-500'}>{res.output}</code>
                {!res.passed && (
                  <div className="mt-1">
                    <span className="block text-[10px] opacity-70 mt-2 mb-1">Expected:</span>
                    <code className="text-green-500">{res.expected}</code>
                  </div>
                )}
              </div>
            </div>
            {res.error && (
              <p className="mt-4 text-[10px] text-center text-muted italic">
                Reason: {res.error}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
