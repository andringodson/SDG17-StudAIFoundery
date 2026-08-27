'use client';

import { useState, useRef, useEffect } from 'react';
import type { AssistantReply } from '@/app/api/assistant/message/route';
import type { AssistantAction, AssistantLanguage } from '@/lib/assistant/knowledge';

interface ChatMessage {
  from: 'user' | 'ai';
  text: string;
  suggestions?: string[];
  escalate?: boolean;
  frustration?: boolean;
  pendingConfirmation?: { kind: 'reminder'; note: string; remindAt: string };
  actions?: AssistantAction[];
  topic?: string;
}

const STARTERS: Record<string, string[]> = {
  company: ['How does this platform work?', 'Help me build a project', 'Show my profile'],
  investor: ['How does this platform work?', 'Explain SDG 17', 'Show my profile'],
  general_user: ['How does this platform work?', 'Explain SDG 17', 'Help me build a project']
};

const LANGUAGE_LABELS: Record<AssistantLanguage, string> = { en: 'English', ta: 'தமிழ்', hi: 'हिन्दी' };

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('general_user');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState<AssistantLanguage>('en');
  const [previousTopic, setPreviousTopic] = useState<string>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => { if (d.user?.role) setRole(d.user.role); }).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language,
          previousTopic,
          context: { pathname: window.location.pathname, hash: window.location.hash }
        })
      });
      const reply: AssistantReply = await res.json();
      if (reply.topic) setPreviousTopic(reply.topic);
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
        body: JSON.stringify({ message: '', confirmReminder: pc, language })
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
        className="glow-btn fixed z-[100] flex h-14 items-center gap-2 rounded-full px-5 font-semibold shadow-2xl"
        style={{ right: '1.25rem', bottom: '1.25rem' }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden="true">✦</span> Stud AI
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Stud AI Assistant"
          aria-modal="true"
          className="fixed inset-0 z-[110] flex h-[100dvh] w-full flex-col overflow-hidden border border-line bg-surface-1 shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(38rem,calc(100dvh-2.5rem))] sm:w-[min(27rem,calc(100vw-2.5rem))] sm:rounded-2xl"
        >
          <header className="flex items-start justify-between border-b border-line bg-[radial-gradient(circle_at_top_left,rgb(0_174_214_/_0.16),transparent_56%)] px-4 py-3">
            <div className="flex gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-cyan/40 bg-brand-deep/50 text-lg" aria-hidden="true">✦</span>
              <div>
              <p className="text-sm font-semibold">Stud AI Assistant</p>
              <p className="mt-0.5 text-xs text-text-2">Your SDG 17 &amp; Platform Support Assistant</p>
              <p className="flex items-center gap-1 text-xs text-text-3">
                <span className="h-1.5 w-1.5 rounded-full bg-status-complete" /> Online · platform data only
              </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={clearChat} className="rounded-lg px-2 py-1 text-xs text-text-3 hover:bg-white/5" title="Clear Chat">Clear</button>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg px-2 py-1 text-text-3 hover:bg-white/5">✕</button>
            </div>
          </header>

          <div ref={scrollRef} className="assistant-chat-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <div className="rounded-xl border border-brand-cyan/25 bg-brand-deep/20 p-3 text-sm text-text-2">
                  <p className="font-semibold text-text">Hello! 👋 I’m the Stud AI Assistant.</p>
                  <p className="mt-1">I can help with the website, SDG 17, partnership strategies, and general support.</p>
                </div>
                <p className="mb-3 mt-4 text-sm text-text-2">Choose a topic to begin:</p>
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
                    <a href="/support" onClick={() => setOpen(false)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Create support request</a>
                    <button onClick={clearChat} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Try another question</button>
                  </div>
                )}
                {m.frustration && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => send('How does this platform work?')} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Try Again</button>
                    <a href="/support" onClick={() => setOpen(false)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Report a problem</a>
                  </div>
                )}
                {m.pendingConfirmation && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => confirmReminder(m.pendingConfirmation!)} className="glow-btn rounded-lg px-3 py-1.5 text-xs font-semibold">Confirm</button>
                    <button onClick={() => setMessages((ms) => [...ms, { from: 'ai', text: 'Cancelled — no reminder was created.' }])} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Cancel</button>
                  </div>
                )}
                {m.suggestions && i === messages.length - 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-2.5 py-1 text-xs text-text-2 hover:bg-white/5">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {m.actions && i === messages.length - 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map((action) => (
                      <a key={action.href} href={action.href} onClick={() => setOpen(false)} className="interactive-outline rounded-full border border-brand-cyan/40 px-2.5 py-1 text-xs font-semibold text-text">
                        {action.label} →
                      </a>
                    ))}
                  </div>
                )}
                {m.from === 'ai' && !m.pendingConfirmation && i === messages.length - 1 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-text-3">
                    <span>Helpful?</span>
                    <button onClick={() => setMessages((ms) => [...ms, { from: 'ai', text: 'Thanks for the feedback.' }])} aria-label="This answer was helpful" className="rounded px-1 hover:bg-white/10">👍</button>
                    <button onClick={() => send('That answer was unclear. I need more help.')} aria-label="This answer was not helpful" className="rounded px-1 hover:bg-white/10">👎</button>
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-xs text-text-3">Thinking…</p>}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-line bg-surface-1/95 p-3 backdrop-blur"
          >
            <div className="mb-2 flex gap-1" aria-label="Assistant language">
              {(Object.keys(LANGUAGE_LABELS) as AssistantLanguage[]).map((code) => (
                <button key={code} type="button" onClick={() => setLanguage(code)} className={`rounded-full px-2 py-1 text-xs ${language === code ? 'bg-white text-black' : 'text-text-3 hover:bg-white/10'}`}>
                  {LANGUAGE_LABELS[code]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              aria-label="Message"
              className="flex-1 min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm"
            />
            <button type="submit" disabled={busy} className="glow-btn min-h-[40px] rounded-lg px-4 text-sm font-semibold disabled:opacity-40">
              Send
            </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
