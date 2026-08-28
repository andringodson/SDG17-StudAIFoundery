'use client';

import { useState, useRef, useEffect } from 'react';
import type { AssistantReply } from '@/app/api/assistant/message/route';
import type { AssistantAction, AssistantLanguage } from '@/lib/assistant/knowledge';
import {
  isSpeechSupported, isSecureContextForSpeech, startDictation, speechErrorMessage,
  ensureMicPermission, hasMicPermission, type DictationSession
} from '@/lib/speech';

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
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [autoListen, setAutoListen] = useState(true);
  const [voiceError, setVoiceError] = useState('');
  const [voiceActive, setVoiceActive] = useState(false); // session wanted, vs. engine currently open
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dictationRef = useRef<DictationSession | null>(null);

  /* Refs mirror state the dictation callbacks need. Those callbacks are
     created once per session and would otherwise close over whatever
     `busy` / `language` were at that moment — the reason a voice question
     could be silently dropped after the first reply. */
  const busyRef = useRef(false);
  const sendRef = useRef<(text: string) => void>(() => {});
  const finalTextRef = useRef('');
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Checked after mount, never during render — the API exists only in the
  // browser, and reading it on the server would break hydration.
  useEffect(() => {
    setVoiceSupported(isSpeechSupported() && isSecureContextForSpeech());
    try {
      // Opt-out, not opt-in: hands-free is the requested default, but a
      // panel that switches the microphone on by itself must be refusable
      // and must remember the refusal.
      setAutoListen(localStorage.getItem('sdg17.autoListen') !== 'off');
    } catch { /* private mode / blocked storage — keep the default */ }
  }, []);

  function stopDictation() {
    if (sendTimerRef.current) { clearTimeout(sendTimerRef.current); sendTimerRef.current = null; }
    finalTextRef.current = '';
    dictationRef.current?.stop();
    dictationRef.current = null;
    setVoiceActive(false);
    setListening(false);
  }

  function toggleAutoListen() {
    setAutoListen((on) => {
      const next = !on;
      try { localStorage.setItem('sdg17.autoListen', next ? 'on' : 'off'); } catch { /* ignore */ }
      if (!next) stopDictation();
      return next;
    });
  }

  /** Opens a dictation session that stays open until explicitly stopped.
   * The session restarts itself through natural pauses (see lib/speech.ts);
   * this only decides what to do with the words. */
  function beginDictation() {
    if (dictationRef.current) return; // never run two engines at once
    setVoiceError('');

    const session = startDictation(language, {
      onTranscript: (text, isFinal) => {
        setInput(text);
        if (!isFinal) return;
        // Send after a short silence rather than on the first final segment,
        // so a question spoken with a pause in it arrives whole instead of
        // being cut in two.
        finalTextRef.current = text;
        if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
        sendTimerRef.current = setTimeout(() => {
          const pending = finalTextRef.current.trim();
          finalTextRef.current = '';
          if (pending && !busyRef.current) sendRef.current(pending);
        }, 900);
      },
      onError: (code) => {
        const message = speechErrorMessage(code);
        if (message) setVoiceError(message);
        // A hard failure (permission denied) already stopped the session.
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          dictationRef.current = null;
          setVoiceActive(false);
          setListening(false);
        }
      },
      onListeningChange: setListening
    });

    if (!session) { setVoiceError('Voice input is not supported in this browser.'); return; }
    dictationRef.current = session;
    setVoiceActive(true);
  }

  /** The mic button. Requests permission explicitly on first use so the
   * prompt and the engine can't race each other. */
  async function toggleDictation() {
    if (voiceActive) { stopDictation(); return; }
    setVoiceError('');
    const granted = await ensureMicPermission();
    if (!granted) {
      setVoiceError(speechErrorMessage('not-allowed'));
      return;
    }
    beginDictation();
  }

  // Keep the live session's language in step with the language buttons.
  useEffect(() => { dictationRef.current?.setLanguage(language); }, [language]);

  // Stop the microphone if the panel closes mid-utterance.
  useEffect(() => {
    if (!open && dictationRef.current) stopDictation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Hands-free: start listening when the panel opens, so asking by voice
  // needs no click. Only where permission was already granted — springing an
  // unprompted permission dialog on open would be hostile; the mic button
  // handles the first grant. Unlike before, this depends on voiceActive, so
  // it isn't a one-shot: the session persists rather than dying at the first
  // pause and never coming back.
  useEffect(() => {
    if (!open || !voiceSupported || !autoListen || voiceActive) return;
    let cancelled = false;
    hasMicPermission()
      .then((granted) => { if (granted && !cancelled) beginDictation(); })
      .catch(() => { /* leave it to the button */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, voiceSupported, autoListen, voiceActive]);

  // Release timers on unmount.
  useEffect(() => () => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    dictationRef.current?.stop();
  }, []);

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
    busyRef.current = true;
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
      busyRef.current = false;
    }
  }

  // The dictation callbacks are created once per session, so they reach the
  // current send() through this ref rather than closing over a stale one.
  sendRef.current = send;

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
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Stud AI</p>
              <p className="flex items-center gap-1.5 text-xs text-text-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-complete" />
                Answers from this platform&apos;s data
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={clearChat} className="rounded-md px-2 py-1 text-xs text-text-3 hover:bg-white/5" title="Clear conversation">Clear</button>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-md px-2 py-1 text-text-3 hover:bg-white/5">✕</button>
            </div>
          </header>

          <div ref={scrollRef} className="assistant-chat-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-text-2">
                  I can help you navigate the platform, explain SDG 17, or look up your own
                  progress and pledges.
                </p>
                <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-[0.12em] text-text-3">Try asking</p>
                <div className="grid gap-2">
                  {(STARTERS[role] ?? STARTERS.general_user!).map((s) => (
                    <button key={s} onClick={() => send(s)} className="tap rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-white/5">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`msg-enter ${m.from === 'user' ? 'text-right' : ''}`}>
                <p className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-left text-sm ${
                  m.from === 'user' ? 'bg-white text-black' : 'border border-line bg-bg/40'
                }`}>
                  {m.text}
                </p>

                {m.escalate && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href="/support" onClick={() => setOpen(false)} className="tap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Create support request</a>
                    <button onClick={clearChat} className="tap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Try another question</button>
                  </div>
                )}
                {m.frustration && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => send('How does this platform work?')} className="tap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Try Again</button>
                    <a href="/support" onClick={() => setOpen(false)} className="tap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Report a problem</a>
                  </div>
                )}
                {m.pendingConfirmation && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => confirmReminder(m.pendingConfirmation!)} className="glow-btn rounded-lg px-3 py-1.5 text-xs font-semibold">Confirm</button>
                    <button onClick={() => setMessages((ms) => [...ms, { from: 'ai', text: 'Cancelled — no reminder was created.' }])} className="tap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Cancel</button>
                  </div>
                )}
                {m.suggestions && i === messages.length - 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button key={s} onClick={() => send(s)} className="tap rounded-full border border-line px-2.5 py-1 text-xs text-text-2 hover:bg-white/5">
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
            {busy && (
              <p className="flex items-center gap-2 text-xs text-text-3" role="status">
                <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span> Thinking
              </p>
            )}
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
            {voiceError && <p role="alert" className="mb-2 text-xs text-red-300">{voiceError}</p>}
            {/* Distinguishes "engine open, speak now" from "session on, engine
                cycling between utterances" — the second used to render as
                nothing at all, which read as the mic having died. */}
            {voiceActive && (
              <p role="status" className="mb-2 flex items-center gap-2 text-xs text-text-2">
                {listening ? (
                  <>
                    <span className="mic-wave" aria-hidden="true"><i /><i /><i /><i /></span>
                    Listening — just speak.
                  </>
                ) : (
                  <>
                    <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
                    Voice on — reconnecting…
                  </>
                )}
              </p>
            )}
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleAutoListen}
                className="mb-2 text-[0.68rem] text-text-3 underline decoration-dotted underline-offset-2 hover:text-text-2"
              >
                {autoListen ? 'Turn off auto-listen' : 'Turn on auto-listen'}
              </button>
            )}
            <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voiceActive ? (listening ? 'Listening…' : 'Voice on…') : 'Ask a question…'}
              aria-label="Message"
              className="flex-1 min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm"
            />
            {/* Rendered only where the browser actually implements speech
                recognition (Firefox does not), so it is never present-but-broken. */}
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleDictation}
                aria-label={voiceActive ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={voiceActive}
                title={voiceActive ? 'Stop listening' : 'Ask by voice'}
                className={`min-h-[40px] w-10 shrink-0 rounded-lg border text-base transition ${
                  voiceActive ? 'border-red-400 bg-red-400/15 text-red-300' : 'border-line text-text-2 hover:bg-white/5'
                }`}
              >
                {voiceActive ? '■' : '🎤'}
              </button>
            )}
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
