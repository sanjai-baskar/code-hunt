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
  const [leaveCount, setLeaveCount] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [language, setLanguage] = useState('java');
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  // Mobile tab: 'problem' | 'editor' | 'console'
  const [mobileTab, setMobileTab] = useState('problem');

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
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timer);
      });
    
    return () => clearTimeout(timer);
  }, [id, navigate, addToast]);

  // fullscreen / multi-tab detection
  useEffect(() => {
    if (!hasStarted || submitted) return;

    const handleHidden = () => {
      if (isDisqualified || submitted) return;
      api.post('/logs', { problemId: id }).catch(() => {});

      setLeaveCount((prev) => {
        const next = prev + 1;
        if (next === 1) {
          setOverlayVisible(true);
          addToast('⚠️ You left the exam window. You may rejoin once.');
        } else {
          setIsDisqualified(true);
          addToast('❌ Multiple window switches detected. The page will remain open.', 'error');
        }
        return next;
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') handleHidden();
      else if (document.visibilityState === 'visible') {
        if (overlayVisible) {
          setOverlayVisible(false);
          addToast('You have rejoined the exam. Continue.');
        }
      }
    };

    const handleBlur = () => { handleHidden(); };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [hasStarted, id, isDisqualified, submitted, overlayVisible, addToast]);

  // copy/paste/cut/selectstart/right-click security
  useEffect(() => {
    if (!hasStarted || isDisqualified || submitted) return;

    const onCopy = (e) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
      setDistractionCount(prev => prev + 1);
      addToast(`⚠️ Forbidden action: Copy`, 'warn');
      api.post('/logs', { problemId: id }).catch(() => {});
    };

    const onCut = (e) => {
      e.preventDefault();
      setDistractionCount(prev => prev + 1);
      addToast(`⚠️ Forbidden action: Cut`, 'warn');
      api.post('/logs', { problemId: id }).catch(() => {});
    };

    const onPaste = (e) => {
      e.preventDefault();
      setDistractionCount(prev => prev + 1);
      addToast(`⚠️ Forbidden action: Paste`, 'warn');
      api.post('/logs', { problemId: id }).catch(() => {});
    };

    const onSelectStart = (e) => {
      // Prevent selection except on inputs/textareas if needed
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        const anchor = selection.anchorNode;
        // If selection is inside problem description or body, clear it
        if (anchor && (anchor.nodeType === 3 || anchor.nodeType === 1)) {
          selection.removeAllRanges();
        }
      }
    };

    const onContext = (e) => { e.preventDefault(); };

    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('selectstart', onSelectStart);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('contextmenu', onContext);

    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('selectstart', onSelectStart);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('contextmenu', onContext);
    };
  }, [hasStarted, id, isDisqualified, submitted, addToast]);

  // keyboard shortcuts disable
  useEffect(() => {
    if (!hasStarted || isDisqualified || submitted) return;

    const onKeyDown = (e) => {
      const key = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'z'].includes(key)) {
        e.preventDefault();
        setDistractionCount(prev => prev + 1);
        addToast('⚠️ Keyboard shortcuts like copy/paste/select/undo are disabled during the exam.', 'warn');
        api.post('/logs', { problemId: id }).catch(() => {});
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasStarted, isDisqualified, submitted, addToast, id]);

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
    if (direction === 'camera-off') {
      setIsDisqualified(true);
      api.post('/logs', { problemId: id }).catch(() => {});
      addToast('⚠️ Camera access was lost. Please re-enable your camera to continue.', 'error');
      return;
    }

    setDistractionCount((prev) => {
      const next = prev + 1;
      let label;
      if (direction === 'away') label = '❌ Face not detected';
      else if (direction === 'extreme-left' || direction === 'extreme-right') 
        label = '⚠️ Head turned too far - looking behind you';
      else if (direction === 'extreme-down') label = '🚨 Looking down - checking external materials?';
      else if (direction === 'extreme-up') label = '⚠️ Looking up - checking wall/ceiling?';
      else if (direction === 'extreme-position-warmup') label = '⚠️ Extreme head position detected';
      else if (direction.startsWith('object-')) label = `🚫 CHEATING: ${direction.replace('object-', '').replace('-', ' ')} detected!`;
      else if (direction === 'multiple-faces') label = '👥 CHEATING: Multiple people in frame!';
      else label = `⚠️ Violation: ${direction}`;
      addToast(label, 'warn');
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
    setTestResults(null);
    try {
      const payload = { code, problemId: id, language };
      const { data } = await api.post('/run', payload);
      setTestResults(data);
      // Auto-switch to console tab on mobile after running
      setMobileTab('console');
      addToast(data.allPassed ? 'Execution complete!' : 'Execution completed with warnings/errors.', data.allPassed ? 'success' : 'warn');
    } catch (err) {
      console.error('Run error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Error executing code.';
      setTestResults({
        results: [
          {
            input: 'Code Execution',
            expected: 'No Runtime Error',
            actual: errMsg,
            passed: false,
            error: `Execution Error: ${errMsg}`,
            time: null
          }
        ],
        summary: { passed: 0, total: 1 }
      });
      setMobileTab('console');
      addToast(`Execution Error: ${errMsg}`, 'error');
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
      if (data.results) {
        setTestResults({ results: data.results, summary: data.summary });
      }
      stop();
      setMobileTab('console');
      addToast(
        data.allPassed
          ? `✅ Submitted! ${data.summary?.passed ?? 0}/${data.summary?.total ?? 0} test cases passed.`
          : `⚠️ Submitted. ${data.summary?.passed ?? 0}/${data.summary?.total ?? 0} test cases passed.`,
        data.allPassed ? 'success' : 'warn'
      );
    } catch (err) {
      console.error('Submission error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Submission failed.';
      setTestResults({
        results: [
          {
            input: 'Code Submission',
            expected: 'Successful Submission',
            actual: errMsg,
            passed: false,
            error: `Submission Error: ${errMsg}`,
            time: null
          }
        ],
        summary: { passed: 0, total: 1 }
      });
      setMobileTab('console');
      addToast(`Submission Error: ${errMsg}`, 'error');
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
      {/* ── Exam start overlay ── */}
      {!hasStarted && (
        <div className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur flex items-center justify-center p-4 text-center">
          <div className="max-w-md w-full lc-card p-6 sm:p-10 border-2 border-brand bg-surface">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-4">Exam Security</h2>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              This environment is proctored by AI. By starting, you agree to:
              <br /><br />
              • Automatic <strong>Full Screen</strong> mode<br />
              {webcamEnabled && <div className="inline">• Active <strong>Face &amp; Gaze</strong> monitoring<br /></div>}
              • <strong>Disqualification</strong> on tab/window switching
            </p>
            <button
              onClick={startChallenge}
              disabled={webcamEnabled && !cameraReady}
              className="lc-btn-primary w-full py-4 text-lg font-bold shadow-[0_0_20px_rgba(255,161,22,0.3)] disabled:opacity-50"
            >
              {webcamEnabled && !cameraReady ? 'Enable Camera to Enter' : 'Enter Exam Arena'}
            </button>
          </div>
        </div>
      )}

      {/* ── Camera required overlay ── */}
      {webcamEnabled && !cameraReady && (
        <div className="fixed inset-0 z-[20000] bg-background/95 backdrop-blur flex items-center justify-center p-4 text-center">
          <div className="max-w-xl w-full lc-card p-6 sm:p-10 border-2 border-red-500 bg-surface shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-4">Camera Required</h2>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              This exam requires your webcam to be enabled. Please allow camera access in your browser and refresh the page.
            </p>
            {cameraError ? (
              <p className="text-sm text-red-500 mb-6">{cameraError}</p>
            ) : (
              <p className="text-sm text-gray-500 mb-6">Waiting for camera permission...</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="lc-btn-secondary px-5 py-3 rounded font-bold"
              >
                Retry Camera Access
              </button>
              <button
                onClick={() => navigate('/student')}
                className="px-5 py-3 rounded font-bold bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security Violation / Error Overlay (Does NOT close the page) ── */}
      {isDisqualified && (
        <div className="fixed inset-0 z-[25000] bg-background/90 backdrop-blur flex items-center justify-center p-4 text-center">
          <div className="max-w-md w-full lc-card p-6 sm:p-8 border-2 border-red-500 bg-surface shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Proctoring Notice / Error</h2>
            <p className="text-sm text-foreground mb-6 leading-relaxed">
              An issue occurred (e.g. camera stream lost or window switch warning).
              <br/><br/>
              <strong>Your page and coding environment will remain open.</strong>
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsDisqualified(false);
                  if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
                className="lc-btn-primary py-3 font-bold bg-red-600 hover:bg-red-500 text-white"
              >
                Resume Coding Arena
              </button>
            </div>
          </div>
        </div>
      )}

      {showBanner && <DistractionBanner count={distractionCount} />}

      {/* ── Rejoin overlay ── */}
      {overlayVisible && (
        <div className="fixed inset-0 z-[30000] bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-md w-full lc-card p-6 sm:p-8 border-border bg-surface text-center">
            <h3 className="text-lg font-bold mb-3">You left the exam window</h3>
            <p className="text-sm text-muted mb-6">You may rejoin once. Click <strong>Rejoin</strong> to continue. Further tab/window switches will terminate your session.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setOverlayVisible(false); addToast('Rejoined exam.'); }}
                className="lc-btn-primary px-6 py-2"
              >
                Rejoin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════ */}
      <div className="lc-navbar shrink-0 justify-between px-3 md:px-6 bg-surface border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/student')} className="text-muted hover:text-foreground text-xs md:text-sm shrink-0">
            ←<span className="hidden sm:inline"> Problems</span>
          </button>
          <span className="text-border shrink-0">|</span>
          <h1 className="text-xs md:text-sm font-bold text-foreground truncate max-w-[100px] sm:max-w-[200px] md:max-w-none">{problem?.title}</h1>
        </div>

        <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-background border border-border text-foreground text-[10px] md:text-sm font-bold rounded px-1.5 py-1 outline-none focus:border-brand"
          >
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>

          <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted">
            <span className="whitespace-nowrap">⏱ {formatted()}</span>
            {webcamEnabled && (
              <>
                <span className="text-border hidden sm:inline">|</span>
                <span className={`${distractionCount >= 10 ? 'text-red-500' : 'text-brand'} whitespace-nowrap hidden sm:inline`}>
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
              {submitLoading ? '...' : submitted ? '✓ Done' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE TAB BAR  (hidden on md+)
      ══════════════════════════════════════════════════════ */}
      <div className="flex md:hidden shrink-0 border-b border-border bg-surface">
        {[
          { key: 'problem', label: '📄 Problem' },
          { key: 'editor',  label: '💻 Editor'  },
          { key: 'console', label: `🖥 Console${testResults ? ' ●' : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMobileTab(key)}
            className={`flex-1 py-2 text-[11px] font-bold transition-colors border-b-2 ${
              mobileTab === key
                ? 'text-brand border-brand'
                : 'text-muted border-transparent hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          WORKSPACE
      ══════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden">

        {/* ── DESKTOP: side-by-side split ── */}
        <div className="hidden md:flex h-full flex-row p-2 gap-2">
          {/* Left: Problem description */}
          <div className="w-[45%] bg-surface rounded-lg border border-border overflow-y-auto p-6 scrollbar-hide">
            <h2 className="text-xl font-bold text-foreground mb-4">{problem?.title}</h2>
            <div className="mb-4">
              <span className={`badge-${problem?.difficulty.toLowerCase()}`}>{problem?.difficulty}</span>
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
            {testResults && (
              <div className="mt-8 pt-8 border-t border-border">
                <TestResults results={testResults.results} summary={testResults.summary} />
              </div>
            )}
          </div>

          {/* Right: Editor + console */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex-1 min-h-0">
              <CodeEditor value={code} onChange={setCode} language={language} />
            </div>
            {testResults && (
              <div className="h-[35%] bg-[#0d1117] rounded-lg border border-border p-4 overflow-y-auto font-mono text-xs">
                <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Console Output &amp; Errors</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    testResults.summary?.passed === testResults.summary?.total
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {testResults.summary?.passed ?? 0}/{testResults.summary?.total ?? 0} Test Cases Passed
                  </span>
                </div>
                <div className="space-y-4">
                  {testResults.results.map((res, idx) => (
                    <div key={idx} className="bg-black/30 p-3 rounded border border-gray-800">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                          ▶ Test Case #{idx + 1} {res.passed ? '✓' : '✗'}
                        </span>
                        {res.time != null && (
                          <span className="text-[9px] text-gray-500">Exec: {Math.round(res.time)}ms</span>
                        )}
                      </div>
                      
                      {res.input && (
                        <div className="mt-2 text-[11px] text-gray-400">
                          <span className="text-gray-500">Input: </span>
                          <span className="text-gray-200">{res.input}</span>
                        </div>
                      )}

                      {res.actual ? (
                        <div className="mt-1.5">
                          <span className="text-[10px] text-gray-500 block">Actual Output / Log:</span>
                          <pre className={`mt-0.5 p-2 rounded whitespace-pre-wrap break-all leading-relaxed ${res.error ? 'bg-red-950/50 text-red-300 border border-red-900/50' : 'bg-gray-900 text-green-300'}`}>
                            {res.actual}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic mt-1">(no output)</p>
                      )}

                      {res.error && (
                        <div className="mt-2 p-2 bg-red-950/70 border border-red-800 rounded">
                          <span className="text-[10px] font-bold text-red-400 block mb-1">🚨 Compilation / Stderr Error Details:</span>
                          <pre className="text-red-300 text-[11px] whitespace-pre-wrap break-all leading-relaxed">{res.error}</pre>
                        </div>
                      )}

                      {!res.passed && res.expected && (
                        <div className="mt-1.5 text-[11px] text-gray-400">
                          <span className="text-gray-500">Expected: </span>
                          <span className="text-green-400 font-mono">{res.expected}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE: single pane controlled by tab bar ── */}
        <div className="flex md:hidden h-full flex-col">

          {/* Problem tab */}
          {mobileTab === 'problem' && (
            <div className="flex-1 overflow-y-auto p-4 bg-surface">
              <h2 className="text-lg font-bold text-foreground mb-3">{problem?.title}</h2>
              <div className="mb-3">
                <span className={`badge-${problem?.difficulty.toLowerCase()}`}>{problem?.difficulty}</span>
              </div>
              <div
                className="text-foreground text-sm leading-relaxed problem-desc"
                dangerouslySetInnerHTML={{
                  __html: problem?.description
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                    .replace(/`([^`]+)`/g, '<code class="bg-background border border-border px-1.5 py-0.5 rounded text-brand font-mono text-xs">$1</code>')
                    .replace(/```(java|js)?\n?([\s\S]*?)```/g, '<pre class="bg-background border border-border p-3 rounded-lg my-3 overflow-x-auto text-xs"><code class="text-muted">$2</code></pre>')
                    .replace(/\n/g, '<br/>')
                }}
              />
              {/* Quick CTA to switch to editor */}
              <button
                onClick={() => setMobileTab('editor')}
                className="mt-6 w-full lc-btn-primary py-3 font-bold"
              >
                Open Editor →
              </button>
            </div>
          )}

          {/* Editor tab */}
          {mobileTab === 'editor' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditor value={code} onChange={setCode} language={language} isMobile />
            </div>
          )}

          {/* Console tab */}
          {mobileTab === 'console' && (
            <div className="flex-1 overflow-y-auto bg-[#0d1117] p-4 font-mono text-xs">
              {testResults ? (
                <>
                  <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Console Output &amp; Errors</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      testResults.summary?.passed === testResults.summary?.total
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {testResults.summary?.passed ?? 0}/{testResults.summary?.total ?? 0} Passed
                    </span>
                  </div>
                  <div className="space-y-4">
                    {testResults.results.map((res, idx) => (
                      <div key={idx} className="bg-black/30 p-3 rounded border border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                            ▶ Test Case #{idx + 1} {res.passed ? '✓' : '✗'}
                          </span>
                          {res.time != null && (
                            <span className="text-[9px] text-gray-500">Exec: {Math.round(res.time)}ms</span>
                          )}
                        </div>

                        {res.input && (
                          <div className="mt-2 text-[11px] text-gray-400">
                            <span className="text-gray-500">Input: </span>
                            <span className="text-gray-200">{res.input}</span>
                          </div>
                        )}

                        {res.actual ? (
                          <div className="mt-1.5">
                            <span className="text-[10px] text-gray-500 block">Actual Output / Log:</span>
                            <pre className={`mt-0.5 p-2 rounded whitespace-pre-wrap break-all leading-relaxed ${res.error ? 'bg-red-950/50 text-red-300 border border-red-900/50' : 'bg-gray-900 text-green-300'}`}>
                              {res.actual}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic mt-1">(no output)</p>
                        )}

                        {res.error && (
                          <div className="mt-2 p-2 bg-red-950/70 border border-red-800 rounded">
                            <span className="text-[10px] font-bold text-red-400 block mb-1">🚨 Compilation / Stderr Error Details:</span>
                            <pre className="text-red-300 text-[11px] whitespace-pre-wrap break-all leading-relaxed">{res.error}</pre>
                          </div>
                        )}

                        {!res.passed && res.expected && (
                          <div className="mt-1.5 text-[11px] text-gray-400">
                            <span className="text-gray-500">Expected: </span>
                            <span className="text-green-400 font-mono">{res.expected}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <TestResults results={testResults.results} summary={testResults.summary} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <span className="text-3xl">🖥</span>
                  <p className="text-muted text-sm">Run your code to see output and compilation errors here.</p>
                  <button
                    onClick={() => setMobileTab('editor')}
                    className="mt-2 lc-btn-primary px-6 py-2 text-xs font-bold"
                  >
                    Go to Editor
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Webcam Monitor */}
      {webcamEnabled && (
        <WebcamMonitor
          onDistraction={handleDistraction}
          getCode={getCode}
          problemId={id}
          onCameraStatusChange={(ready, error) => {
            setCameraReady(ready);
            setCameraError(error);
          }}
        />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}
