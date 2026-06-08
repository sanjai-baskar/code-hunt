import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useTimer } from '../hooks/useTimer';
import CodeEditor from '../components/CodeEditor';
import WebcamMonitor from '../components/WebcamMonitor';
import DistractionBanner from '../components/DistractionBanner';
import TestResults from '../components/TestResults';
import Toast from '../components/Toast';


export default function CodingChallenge() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatted, start, stop } = useTimer();

  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [distractionCount, setDistractionCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [language, setLanguage] = useState('java');
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const codeRef = useRef(code);
  const getCode = useCallback(() => codeRef.current, []);

  useEffect(() => { codeRef.current = code; }, [code]);

  // ==========  addToast MUST be defined before any useEffect that uses it ==========
  const addToast = useCallback((message, type = 'default') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  // Fetch problem + webcam setting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Initial load taking too long, forcing ready state.");
        setLoading(false);
      }
    }, 8000); // 8 second safety timeout

    Promise.all([
      api.get(`/problems/${id}`),
      api.get('/settings/webcam'),
    ])
      .then(([{ data: problem }, { data: settings }]) => {
        setProblem(problem);
        setCode(problem.starterCode || '');
        setWebcamEnabled(settings.webcamEnabled);
      })
      .catch((err) => {
        console.error("Failed to load challenge:", err);
        addToast("Error loading challenge. Please try again.", "error");
        // Don't navigate away immediately, give user a chance or show error state
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timer);
      });
    
    return () => clearTimeout(timer);
  }, [id, navigate, addToast]);

  // fullscreen / multi‑tab detection
  useEffect(() => {
    if (!hasStarted) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && !isDisqualified) {
        setIsDisqualified(true);
        // Only send problemId — no code snapshot
        api.post('/logs', { problemId: id }).catch(() => {});
        alert("CRITICAL SECURITY VIOLATION: Multi-tab/Window switching detected. Your session has been terminated.");
        localStorage.clear();
        window.location.href = '/login';
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleVisibility);
    };
  }, [hasStarted, id, isDisqualified]);

  // copy/paste/right‑click security – now addToast exists
  useEffect(() => {
    if (!hasStarted || isDisqualified) return;

    const handleSecurityViolation = (e) => {
      e.preventDefault();
      setDistractionCount(prev => prev + 1);
      addToast("⚠️ Security Violation: Unauthorized action detected!", "error");
      setIsDisqualified(true);
      // Only send problemId — no code snapshot
      api.post('/logs', { problemId: id }).catch(() => {});
      setTimeout(() => {
        alert("SECURITY VIOLATION: Copy, Paste, and Right-click are strictly prohibited. Your session has been terminated and this incident has been logged.");
        localStorage.clear();
        window.location.href = '/';
      }, 1000);
    };

    document.addEventListener('copy', handleSecurityViolation);
    document.addEventListener('paste', handleSecurityViolation);
    document.addEventListener('contextmenu', handleSecurityViolation);

    return () => {
      document.removeEventListener('copy', handleSecurityViolation);
      document.removeEventListener('paste', handleSecurityViolation);
      document.removeEventListener('contextmenu', handleSecurityViolation);
    };
  }, [hasStarted, id, isDisqualified, addToast]);

  const startChallenge = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
    setHasStarted(true);
    start();
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (lang === 'java') {
      setCode(problem?.starterCode || '');
    } else if (lang === 'python') {
      setCode('import sys\n\ndef main():\n    # Read from stdin\n    # input_data = sys.stdin.read().split()\n    \n    # Your logic here\n    pass\n\nif __name__ == "__main__":\n    main()');
    } else if (lang === 'cpp') {
      setCode('#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Your logic here\n    \n    return 0;\n}');
    } else if (lang === 'c') {
      setCode('#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Your logic here\n    \n    return 0;\n}');
    }
  };

  const handleDistraction = useCallback((direction) => {
    // Only terminate on real hardware failure (camera physically unavailable)
    if (direction === 'camera-off') {
      setIsDisqualified(true);
      // Only send problemId — no code snapshot
      api.post('/logs', { problemId: id }).catch(() => {});
      alert('Camera access was lost. Your session has been terminated.');
      localStorage.clear();
      window.location.href = '/login';
      return;
    }

    // All other distractions are counted and logged – NOT an immediate disqualification
    setDistractionCount((prev) => {
      const next = prev + 1;
      let label;
      if (direction === 'away') label = 'Face not detected';
      else if (direction === 'talking') label = 'Voice/Talking detected';
      else if (direction === 'suspicious-pose') label = 'Suspicious head movement';
      else if (direction.startsWith('object-')) label = `Forbidden object: ${direction.replace('object-', '').replace('-', ' ')}`;
      else if (direction === 'multiple-faces') label = 'Multiple faces detected!';
      else label = `Looking ${direction}`;
      addToast(`⚠️ ${label}`, 'warn');
      // Lightweight log — only problemId, no code snapshot
      api.post('/logs', { problemId: id }).catch(() => {});
      if (next >= 10) {
        setShowBanner(true);
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => { });
        }
      }
      return next;
    });
  }, [addToast, id]);

  const runCode = async () => {
    setRunLoading(true);
    try {
      const payload = { code, problemId: id, language };

      const { data } = await api.post('/run', payload);
      setTestResults(data);
      addToast(data.allPassed ? 'Execution complete!' : 'Execution failed.', data.allPassed ? 'success' : 'warn');
    } catch (err) {
      addToast('Error running code.', 'error');
    } finally {
      setRunLoading(false);
    }
  };

  const submitCode = async () => {
    setSubmitLoading(true);
    try {
      const { data } = await api.post('/submit', { code, problemId: id, distractionCount, language });
      setSubmitResult(data);
      setSubmitted(true);
      stop();
      addToast('Submitted successfully!', 'success');
    } catch (err) {
      addToast('Submission failed.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-foreground font-black text-lg tracking-tight">Preparing Arena</p>
          <p className="text-muted text-xs uppercase tracking-widest mt-1">Initializing Secure Environment</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {!hasStarted && (
        <div className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full lc-card p-10 border-2 border-brand bg-surface">
            <h2 className="text-3xl font-black text-foreground mb-4">Exam Security</h2>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              This environment is proctored by AI. By starting, you agree to:
              <br /><br />
              • Automatic <strong>Full Screen</strong> mode<br />
              {webcamEnabled && <div className="inline">• Active <strong>Face & Gaze</strong> monitoring<br /></div>}
              • <strong>Disqualification</strong> on tab/window switching
            </p>
            <button
              onClick={startChallenge}
              className="lc-btn-primary w-full py-4 text-lg font-bold shadow-[0_0_20px_rgba(255,161,22,0.3)]"
            >
              Enter Exam Arena
            </button>
          </div>
        </div>
      )}

      {showBanner && <DistractionBanner count={distractionCount} />}

      {/* Navbar */}
      <div className="lc-navbar shrink-0 justify-between px-4 md:px-6 bg-surface border-b border-border">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate('/student')} className="text-muted hover:text-foreground text-xs md:text-sm">
            ← <span className="hidden sm:inline">Problems</span>
          </button>
          <span className="text-border">|</span>
          <h1 className="text-xs md:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-none">{problem?.title}</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-6">
          <select 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-background border border-border text-foreground text-xs md:text-sm font-bold rounded px-2 py-1 outline-none focus:border-brand"
          >
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>

          <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted">
             <span className="whitespace-nowrap">⏱ {formatted()}</span>
             {webcamEnabled && (
               <>
                 <span className="text-border">|</span>
                 <span className={`${distractionCount >= 10 ? 'text-red-500' : 'text-brand'} whitespace-nowrap`}>
                   👁️ {distractionCount}/10
                 </span>
               </>
             )}
          </div>
          <div className="flex gap-1 md:gap-2">
            <button
              onClick={runCode}
              disabled={runLoading || submitted}
              className="lc-btn-secondary py-1 px-2 md:py-1.5 md:px-4 text-[10px] md:text-xs font-bold rounded disabled:opacity-50 transition-colors"
            >
              {runLoading ? '...' : 'Run'}
            </button>
            <button
              onClick={submitCode}
              disabled={submitLoading || submitted}
              className="px-2 py-1 md:px-4 md:py-1.5 bg-green-600 hover:bg-green-500 text-white text-[10px] md:text-xs font-bold rounded disabled:opacity-50 transition-colors"
            >
              {submitLoading ? '...' : submitted ? 'Ok' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 gap-2">
        {/* Left: Description */}
        <div className="w-full md:w-[45%] h-[40%] md:h-auto bg-surface rounded-lg border border-border overflow-y-auto p-4 md:p-6 scrollbar-hide">
          <h2 className="text-xl font-bold text-foreground mb-4">{problem?.title}</h2>
          <div className="mb-4">
            <span className={`badge-${problem?.difficulty.toLowerCase()}`}>
              {problem?.difficulty}
            </span>
          </div>
          
          <div 
            className="text-foreground text-sm leading-relaxed problem-desc"
            dangerouslySetInnerHTML={{
              __html: problem?.description
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-background border border-border px-1.5 py-0.5 rounded text-brand font-mono text-[13px]">$1</code>')
                .replace(/```(java|js)?\n?([\s\S]*?)```/g, '<pre class="bg-background border border-border p-4 rounded-lg my-4 overflow-x-auto"><code class="text-muted">$2</code></pre>')
                .replace(/\n/g, '<br/>')
            }}
          />

          <div className="mt-8 pt-8 border-t border-border">
            {testResults && (
              <TestResults results={testResults.results} summary={testResults.summary} />
            )}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 min-h-0">
            <CodeEditor value={code} onChange={setCode} language={language} />
          </div>

          {/* Bottom Panel (optional console output) */}
          {testResults && (
            <div className="h-[30%] bg-surface rounded-lg border border-border p-4 overflow-y-auto">
              <h3 className="text-xs font-bold text-muted uppercase mb-3">Console</h3>
              <div className="font-mono text-xs text-foreground space-y-1">
                {testResults.results[0]?.logs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webcam Monitor — only if webcam is enabled by admin */}
      {webcamEnabled && (
        <WebcamMonitor
          onDistraction={handleDistraction}
          getCode={getCode}
          problemId={id}
        />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}
