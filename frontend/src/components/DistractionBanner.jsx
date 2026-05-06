import React from 'react';

export default function DistractionBanner({ count }) {
  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md">
      <div className="bg-white border-2 border-[#ef4743] rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl animate-fade-in mx-4">
        <div className="w-20 h-20 bg-[#ef4743]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#ef4743]/20">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-3xl font-black text-[#ef4743] tracking-tight mb-4 uppercase">Session Locked</h1>
        <p className="text-[var(--text-main)] text-lg mb-2">
          You have exceeded the maximum number of allowed distractions ({count}/10).
        </p>
        <p className="text-[var(--text-muted)] text-sm mb-8">
          This session has been flagged. Further activity will be recorded and reviewed by your proctor. Please focus on your screen.
        </p>
        
        <button 
          onClick={enterFullscreen}
          className="lc-btn-primary px-8 py-3 w-full !bg-[#ef4743] hover:!bg-[#e0403c] !text-white"
        >
          RE-ENTER FULLSCREEN
        </button>
      </div>
    </div>
  );
}
