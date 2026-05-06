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
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const codeRef = useRef(code);

  useEffect(() => { codeRef.current = code; }, [code]);

  useEffect(() => {
    api.get(`/problems/${id}`)
      .then(({ data }) => {
        setProblem(data);
        setCode(data.starterCode || '');
      })
      .catch(() => navigate('/student'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!hasStarted) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && !isDisqualified) {
        setIsDisqualified(true);
        api.post('/logs', {
          problemId: id,
          direction: 'multi-tab-detection',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          codeSnapshot: codeRef.current
        }).catch(() => { });

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

  useEffect(() => {
    if (!hasStarted || isDisqualified) return;

    const handleSecurityViolation = (e) => {
      e.preventDefault();

      // Count as a distraction
      setDistractionCount(prev => prev + 1);
      addToast("⚠️ Security Violation: Unauthorized action detected!", "error");

      setIsDisqualified(true);

      api.post('/logs', {
        problemId: id,
        direction: 'SECURITY_VIOLATION_UNAUTHORIZED_INPUT',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        codeSnapshot: codeRef.current
      }).catch(() => { });

      // Terminate session after a short delay
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

  const addToast = useCallback((message, type = 'default') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const handleDistraction = useCallback((direction) => {
    // Only terminate on real hardware failure (camera physically unavailable)
    if (direction === 'camera-off') {
      setIsDisqualified(true);
      api.post('/logs', {
        problemId: id,
        direction: 'CRITICAL_camera-off',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        codeSnapshot: codeRef.current
      }).catch(() => { });
      alert('Camera access was lost. Your session has been terminated.');
      localStorage.clear();
      window.location.href = '/login';
      return;
    }

    // All other distractions (away, looking left/right/up, objects, multiple faces)
    // are counted and logged — NOT an immediate disqualification
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
      const payload = { code, problemId: id };
      if (useCustomInput) payload.customInput = customInput;

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
      const { data } = await api.post('/submit', { code, problemId: id, distractionCount });
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
    <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#ffa116] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {!hasStarted && (
        <div className="fixed inset-0 z-[10000] bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full lc-card p-10 border-2 border-[#ffa116]">
            <h2 className="text-3xl font-black text-white mb-4">Exam Security</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              This environment is proctored by AI. By starting, you agree to:
              <br /><br />
              • Automatic <strong>Full Screen</strong> mode<br />
              • Active <strong>Face & Gaze</strong> monitoring<br />
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
      <div className="lc-navbar shrink-0 justify-between px-4 md:px-6 bg-[#141414] border-b border-[#262626]">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate('/student')} className="text-gray-400 hover:text-white text-xs md:text-sm">
            ← <span className="hidden sm:inline">Problems</span>
          </button>
          <span className="text-[#262626]">|</span>
          <h1 className="text-xs md:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-none">{problem?.title}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400">
            <span className="whitespace-nowrap">⏱ {formatted()}</span>
            <span className="text-[#262626]">|</span>
            <span className={`${distractionCount >= 10 ? 'text-red-500' : 'text-[#ffa116]'} whitespace-nowrap`}>
              👁️ {distractionCount}/10
            </span>
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
              className="px-2 py-1 md:px-4 md:py-1.5 bg-[#2cbb5d] hover:bg-[#34d399] text-white text-[10px] md:text-xs font-bold rounded disabled:opacity-50 transition-colors"
            >
              {submitLoading ? '...' : submitted ? 'Ok' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 gap-2">
        {/* Left: Description */}
        <div className="w-full md:w-[45%] h-[40%] md:h-auto bg-[#141414] rounded-lg border border-[#262626] overflow-y-auto p-4 md:p-6 scrollbar-hide">
          <h2 className="text-xl font-bold text-white mb-4">{problem?.title}</h2>
          <div className="mb-4">
            <span className={`badge-${problem?.difficulty.toLowerCase()}`}>
              {problem?.difficulty}
            </span>
          </div>

          <div
            className="text-white text-sm leading-relaxed problem-desc"
            dangerouslySetInnerHTML={{
              __html: problem?.description
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-[#0a0a0a] border border-[#262626] px-1.5 py-0.5 rounded text-[#ffa116] font-mono text-[13px]">$1</code>')
                .replace(/```(java|js)?\n?([\s\S]*?)```/g, '<pre class="bg-[#0a0a0a] border border-[#262626] p-4 rounded-lg my-4 overflow-x-auto"><code class="text-gray-400">$2</code></pre>')
                .replace(/\n/g, '<br/>')
            }}
          />

          <div className="mt-8 pt-8 border-t border-[#262626]">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="custom-input-check"
                checked={useCustomInput}
                onChange={(e) => setUseCustomInput(e.target.checked)}
                className="w-4 h-4 rounded border-[#262626] text-[#ffa116] focus:ring-[#ffa116] bg-[#0a0a0a]"
              />
              <label htmlFor="custom-input-check" className="text-sm font-medium text-white cursor-pointer">Use Custom Input</label>
            </div>

            {useCustomInput && (
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter input here (e.g. 5 10)..."
                className="w-full h-32 bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-[#ffa116] mb-6"
              />
            )}

            {testResults && (
              <TestResults results={testResults.results} summary={testResults.summary} />
            )}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 rounded-lg border border-[#262626] overflow-hidden">
            <CodeEditor value={code} onChange={setCode} language="java" />
          </div>

          {/* Bottom Panel (optional console output) */}
          {testResults && (
            <div className="h-[30%] bg-[#141414] rounded-lg border border-[#262626] p-4 overflow-y-auto">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Console</h3>
              <div className="font-mono text-xs text-white space-y-1">
                {testResults.results[0]?.logs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <WebcamMonitor
        onDistraction={handleDistraction}
        getCode={() => codeRef.current}
        problemId={id}
      />
      <Toast toasts={toasts} />
    </div>
  );
}
