import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Hero Section */}
      <nav className="lc-navbar justify-between border-none bg-transparent pt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span className="text-xl font-bold">Code<span className="text-brand">Hunt</span></span>
        </div>
        <div className="flex gap-6 items-center">
          <Link to="/login" className="text-sm font-bold hover:text-brand transition-colors">Student Login</Link>
          <Link to="/admin/login" className="text-sm font-bold hover:text-brand transition-colors">Admin Access</Link>
          <Link to="/signup" className="lc-btn-primary !py-1.5 !px-4 text-sm">Join Now</Link>
        </div>

      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <h1 className="text-6xl font-black tracking-tight mb-6 leading-[1.1]">
              The Future of <span className="text-brand">Academic Integrity</span> is Here.
            </h1>
            <p className="text-xl text-muted mb-10 leading-relaxed max-w-xl">
              Code Hunt is an AI-powered proctoring platform designed to ensure fair play in coding assessments. 
              With real-time gaze monitoring, object detection, and behavioral analysis, we protect the value of your skills.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" className="lc-btn-primary !py-4 !px-8 text-lg shadow-[0_10px_20px_rgba(255,161,22,0.3)]">
                Student Arena
              </Link>
              <Link to="/admin/login" className="lc-btn-secondary !py-4 !px-8 text-lg font-bold border-2 border-border text-foreground hover:bg-surface">
                Admin Portal
              </Link>
            </div>

            
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-surface" />
                ))}
              </div>
              <p className="text-sm text-muted">
                Trusted by <span className="text-foreground font-bold">1,000+</span> educators worldwide
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ffa116]/20 to-transparent rounded-3xl blur-3xl" />
            <div className="relative lc-card p-4 rotate-2 group-hover:rotate-0 transition-transform duration-500 overflow-hidden border-border bg-surface">
               <div className="aspect-video bg-background rounded-lg overflow-hidden relative border border-border">
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5">
                    <span className="text-4xl">📸</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 h-12 bg-surface/80 backdrop-blur rounded-lg border border-border flex items-center px-4 justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-muted">AI Active</span>
                    </div>
                    <span className="text-[10px] font-black text-brand">EYE GAZE DETECTED</span>
                  </div>
               </div>
            </div>
            <div className="absolute -bottom-6 -left-6 lc-card p-6 -rotate-3 group-hover:rotate-0 transition-transform duration-500 max-w-[240px] border-border bg-surface">
              <h3 className="text-sm font-bold mb-2 text-foreground">Security Report</h3>
              <div className="space-y-2">
                <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
                   <div className="h-full w-[90%] bg-green-500" />
                </div>
                <p className="text-[10px] text-muted font-medium">98% Integrity Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <section className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { title: 'AI Proctoring', desc: 'Real-time eye tracking and object detection powered by MediaPipe and TensorFlow.', icon: '👁️' },
             { title: 'Code Protection', desc: 'Secure environment preventing copy-pasting, multi-tab usage, and external tools.', icon: '🛡️' },
             { title: 'Test Efficiency', desc: 'Comprehensive logging and instant results for both students and instructors.', icon: '⚡' },
           ].map(f => (
             <div key={f.title} className="lc-card p-8 border-border bg-surface hover:border-brand transition-colors cursor-default">
               <span className="text-4xl mb-4 block">{f.icon}</span>
               <h3 className="text-xl font-bold mb-3 text-foreground">{f.title}</h3>
               <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
             </div>
           ))}
        </section>
      </main>

      <footer className="border-t border-border py-12 mt-20">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">Code<span className="text-brand">Hunt</span></span>
            </div>
            <p className="text-sm text-muted">© 2026 Code Hunt Platform. Secure. Fair. Transparent.</p>
            <Link to="/admin/login" className="text-xs text-muted hover:text-foreground uppercase tracking-widest font-bold transition-colors">Admin Login</Link>
         </div>
      </footer>
    </div>
  );
}
