import React from 'react';

export default function TestResults({ results, summary }) {
  if (!results || results.length === 0) return null;

  const hasErrors = results.some(r => r.error || !r.passed);

  return (
    <div className="mt-6 border-t border-border pt-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span>{hasErrors ? '🚨' : '🚀'}</span> Execution &amp; Output Results
        </h3>
        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
          summary?.passed === summary?.total
            ? 'bg-green-500/10 text-green-500 border-green-500/30'
            : 'bg-red-500/10 text-red-500 border-red-500/30'
        }`}>
          {summary?.passed ?? 0} / {summary?.total ?? 0} Passed
        </span>
      </div>

      <div className="space-y-3">
        {results.map((res, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border text-sm transition-all ${
              res.passed
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-red-500/5 border-red-500/30'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Test Case #{idx + 1}
              </span>
              <span className={`text-xs font-bold ${res.passed ? 'text-green-500' : 'text-red-500'}`}>
                {res.passed ? '✅ Passed' : res.error ? '❌ Error' : '❌ Failed'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <span className="block text-[10px] text-muted font-sans font-semibold uppercase mb-1">Input:</span>
                <pre className="text-foreground bg-background p-2 rounded border border-border whitespace-pre-wrap break-all">{res.input || '(none)'}</pre>
                {res.time != null && (
                  <p className="mt-1.5 text-[9px] text-muted italic">
                    Exec Time: {Math.round(res.time)}ms
                  </p>
                )}
              </div>
              <div>
                <span className="block text-[10px] text-muted font-sans font-semibold uppercase mb-1">Output / Result:</span>
                <pre className={`p-2 rounded border whitespace-pre-wrap break-all ${
                  res.passed
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {res.actual || '(no output)'}
                </pre>
                {!res.passed && res.expected && (
                  <div className="mt-2">
                    <span className="block text-[10px] text-muted font-sans font-semibold uppercase mb-1">Expected Output:</span>
                    <pre className="text-green-400 bg-background p-2 rounded border border-border whitespace-pre-wrap break-all">{res.expected}</pre>
                  </div>
                )}
              </div>
            </div>

            {res.error && (
              <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <p className="text-[11px] font-bold text-red-500 mb-1 flex items-center gap-1">
                  <span>⚠️</span> Error / Stderr Details:
                </p>
                <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap break-all leading-relaxed bg-black/40 p-2 rounded">
                  {res.error}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
