'use client';

import { useState, useRef, useEffect } from 'react';
import type { AssistantReply } from '@/app/api/assistant/message/route';

interface ChatMessage {
  from: 'user' | 'ai';
  text: string;
  suggestions?: string[];
  escalate?: boolean;
  frustration?: boolean;
  pendingConfirmation?: { kind: 'reminder'; note: string; remindAt: string };
}

const STARTERS: Record<string, string[]> = {
  company: ['How does this platform work?', 'Explain SDG 17', 'Show my profile'],
  investor: ['How does this platform work?', 'Explain SDG 17', 'Show my profile'],
  general_user: ['How does this platform work?', 'Explain SDG 17', 'Show my points']
};

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('general_user');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => { if (d.user?.role) setRole(d.user.role); }).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const reply: AssistantReply = await res.json();
      setMessages((m) => [...m, { from: 'ai', ...reply }]);
    } catch {
      setMessages((m) => [...m, { from: 'ai', text: "I'm unable to respond right now. You can try again shortly." }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmReminder(pc: NonNullable<ChatMessage['pendingConfirmation']>) {
    setBusy(true);
    try {
      const res = await fetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', confirmReminder: pc })
      });
      const reply: AssistantReply = await res.json();
      setMessages((m) => [...m, { from: 'ai', text: reply.text }]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glow-btn fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full px-5 font-semibold shadow-2xl"
        aria-haspopup="dialog"
      >
        ✨ Ask AI
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="AI Financial & Partnership Assistant"
          className="fixed bottom-0 right-0 z-50 flex h-[min(32rem,100dvh)] w-[min(24rem,100vw)] flex-col border border-line bg-surface-1 sm:bottom-5 sm:right-5 sm:rounded-2xl sm:shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold">AI Financial &amp; Partnership Assistant</p>
              <p className="flex items-center gap-1 text-xs text-text-3">
                <span className="h-1.5 w-1.5 rounded-full bg-status-complete" /> Online — platform data only
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={clearChat} className="rounded-lg px-2 py-1 text-xs text-text-3 hover:bg-white/5" title="Clear Chat">Clear</button>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg px-2 py-1 text-text-3 hover:bg-white/5">✕</button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <p className="mb-3 text-sm text-text-2">Try asking:</p>
                <div className="grid gap-2">
                  {(STARTERS[role] ?? STARTERS.general_user!).map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-white/5">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.from === 'user' ? 'text-right' : ''}>
                <p className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-left text-sm ${
                  m.from === 'user' ? 'bg-white text-black' : 'border border-line bg-bg/40'
                }`}>
                  {m.text}
                </p>

                {m.escalate && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href="mailto:support@example.com" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Contact Support</a>
                    <a href="mailto:support@example.com?subject=Request%20human%20advisor" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Request Human Advisor</a>
                  </div>
                )}
                {m.frustration && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => send('How does this platform work?')} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Try Again</button>
                    <a href="mailto:support@example.com" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Contact Support</a>
                  </div>
                )}
                {m.pendingConfirmation && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => confirmReminder(m.pendingConfirmation!)} className="glow-btn rounded-lg px-3 py-1.5 text-xs font-semibold">Confirm</button>
                    <button onClick={() => setMessages((ms) => [...ms, { from: 'ai', text: 'Cancelled — no reminder was created.' }])} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Cancel</button>
                  </div>
                )}
                {m.suggestions && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-2.5 py-1 text-xs text-text-2 hover:bg-white/5">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-xs text-text-3">Thinking…</p>}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              aria-label="Message"
              className="flex-1 min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm"
            />
            <button type="submit" disabled={busy} className="glow-btn min-h-[40px] rounded-lg px-4 text-sm font-semibold disabled:opacity-40">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
