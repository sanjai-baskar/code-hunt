import React, { useState, useRef, useEffect } from 'react';

const SYSTEM_CONTEXT = `You are CodeHunt Assistant, a helpful AI chatbot for the CodeHunt coding platform.
CodeHunt is an AI-powered proctoring platform for coding assessments.
Help students with:
- How to use the platform (practice problems, contests, submitting code)
- General coding questions and debugging tips
- Understanding problem statements
- Tips for improving coding skills
- Platform features like how proctoring works
Keep answers concise, friendly and encouraging. If asked about something unrelated, politely redirect to coding topics.`;

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function askGemini(messages) {
  if (!GEMINI_API_KEY) {
    // Fallback responses when no API key
    const last = messages[messages.length - 1]?.text?.toLowerCase() || '';
    if (last.includes('hello') || last.includes('hi')) return "Hi there! 👋 I'm CodeHunt Assistant. Ask me anything about the platform or coding!";
    if (last.includes('problem') || last.includes('challenge')) return "To solve a problem, go to **Practice** tab, click any problem, write your code in the editor, and hit **Submit**. The system will run your code against test cases!";
    if (last.includes('contest')) return "Contests are timed events. Go to the **Contests** tab to see active and upcoming contests. Click **Enter Contest** when it's live!";
    if (last.includes('webcam') || last.includes('camera') || last.includes('proctor')) return "CodeHunt uses AI proctoring to ensure fair assessments. Your webcam monitors for distractions. Make sure you're in a well-lit area and looking at the screen!";
    if (last.includes('submit')) return "To submit: write your solution in the code editor, then click **Submit**. You'll see which test cases passed or failed instantly.";
    if (last.includes('cheat') || last.includes('copy') || last.includes('paste')) return "⚠️ Copy-pasting is disabled during assessments. The system detects it automatically. Write your own code — it's the best way to learn!";
    if (last.includes('tip') || last.includes('advice') || last.includes('improve')) return "💡 Tips to improve:\n1. Solve at least one problem daily\n2. Read problem constraints carefully\n3. Start with easy problems and work your way up\n4. Learn time & space complexity analysis\n5. Practice on CodeHunt regularly!";
    return "I'm here to help! Ask me about solving problems, using the platform, or any coding tips. 😊 (For more detailed AI responses, an API key needs to be configured.)";
  }

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));
  const userMsg = messages[messages.length - 1].text;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_CONTEXT }] },
    contents: [
      ...history,
      { role: 'user', parts: [{ text: userMsg }] }
    ],
    generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response. Please try again!";
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "👋 Hi! I'm your **CodeHunt Assistant**. Ask me anything about the platform, problems, or coding tips!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMessages = [...messages, { role: 'user', text }];
    setMessages(userMessages);
    setLoading(true);
    try {
      const reply = await askGemini(userMessages);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Simple markdown renderer (bold, newlines)
  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <span key={i}>{parts}{i < text.split('\n').length - 1 && <br />}</span>;
    });
  };

  const quickQuestions = [
    "How do I submit code?",
    "How do contests work?",
    "Tips to improve coding?",
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand shadow-[0_8px_30px_rgba(255,161,22,0.5)] flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="Open ChatBot"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] flex flex-col rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-border bg-surface animate-fade-in"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand/90 to-brand flex items-center gap-3 px-4 py-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl">🤖</div>
            <div>
              <p className="text-white font-bold text-sm">CodeHunt Assistant</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                <p className="text-white/70 text-[10px]">Online · Ask me anything</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background" style={{ minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-sm shrink-0 mr-2 mt-1">🤖</div>
                )}
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-surface border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-sm shrink-0 mr-2">🤖</div>
                <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 bg-background flex gap-2 overflow-x-auto shrink-0">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => send(), 50); setInput(q); }}
                  className="shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-brand/40 text-brand bg-brand/5 hover:bg-brand/15 transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 bg-surface border-t border-border shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a question..."
                className="flex-1 resize-none bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
                style={{ maxHeight: 72 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand/80 transition-all shrink-0"
              >
                <svg className="w-3.5 h-3.5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 21L23 12 2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
