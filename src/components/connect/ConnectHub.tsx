'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Role = 'company' | 'investor' | 'government' | 'general_user';

interface DirectoryEntry {
  userId: string;
  role: 'company' | 'investor' | 'government';
  orgName: string;
  subtitle: string;
  sector: string;
  location: string;
  score: number;
  label: string;
}

interface Thread {
  id: string;
  otherUserId: string;
  otherName: string;
  otherRole: string;
  lastMessage: string | null;
  lastAt: string | null;
  mine: boolean;
  unread: boolean;
}

interface Message {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
}

const ROLE_ICON: Record<string, string> = { company: '🏢', investor: '💼', government: '🏛️', general_user: '🌍' };
const ROLE_LABEL: Record<string, string> = { company: 'Business', investor: 'Investor', government: 'Government', general_user: 'Explorer' };
const FILTERS = ['all', 'company', 'investor', 'government'] as const;

export function ConnectHub({ selfRole }: { selfRole: string }) {
  const [tab, setTab] = useState<'messages' | 'directory'>('messages');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[] | null>(null);
  const [directoryError, setDirectoryError] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [search, setSearch] = useState('');

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState('');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [compose, setCompose] = useState('');
  const [sending, setSending] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/connect/threads', { cache: 'no-store' });
      if (res.ok) setThreads((await res.json()).threads ?? []);
    } catch {
      /* transient network error — the list just stays at its last known state */
    }
  }, []);

  const loadDirectory = useCallback(async () => {
    try {
      const res = await fetch('/api/connect/directory', { cache: 'no-store' });
      if (res.ok) {
        setDirectory((await res.json()).entries ?? []);
        setDirectoryError('');
      } else {
        setDirectoryError('Could not load the partner directory right now.');
      }
    } catch {
      setDirectoryError('Could not load the partner directory right now.');
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/connect/threads/${threadId}/messages`, { cache: 'no-store' });
      if (res.ok) setMessages((await res.json()).messages ?? []);
    } catch {
      /* keep last known messages on a transient failure */
    }
  }, []);

  // Thread list: refresh on mount and every 8s — frequent enough to feel
  // live without hammering the DB for a list that rarely changes second to
  // second.
  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 8000);
    return () => clearInterval(t);
  }, [loadThreads]);

  useEffect(() => {
    if (tab === 'directory' && directory === null) loadDirectory();
  }, [tab, directory, loadDirectory]);

  // Active thread: poll every 3s for new messages — this deployment has no
  // always-on server to push over a socket, so short polling is the honest
  // stand-in for real-time (see the API route's own comment).
  useEffect(() => {
    if (!activeThreadId) return;
    loadMessages(activeThreadId);
    const t = setInterval(() => loadMessages(activeThreadId), 3000);
    return () => clearInterval(t);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function openThread(id: string, name: string) {
    setActiveThreadId(id);
    setActiveName(name);
    setMessages(null);
    setDraftNotice('');
    setTab('messages');
  }

  async function startThread(entry: DirectoryEntry) {
    try {
      const res = await fetch('/api/connect/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientUserId: entry.userId })
      });
      const data = await res.json();
      if (!res.ok) return;
      openThread(data.threadId, entry.orgName);
      loadThreads();
    } catch {
      /* leave the directory open — the user can retry the tap */
    }
  }

  async function send() {
    const body = compose.trim();
    if (!body || !activeThreadId || sending) return;
    setSending(true);
    setCompose('');
    try {
      const res = await fetch(`/api/connect/threads/${activeThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      if (res.ok) {
        await loadMessages(activeThreadId);
        loadThreads();
      } else {
        setCompose(body); // give the draft back so it isn't lost
      }
    } catch {
      setCompose(body);
    } finally {
      setSending(false);
    }
  }

  async function requestDraft() {
    if (!activeThreadId || draftBusy) return;
    setDraftBusy(true);
    setDraftNotice('');
    try {
      const res = await fetch(`/api/connect/threads/${activeThreadId}/draft`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setDraftNotice(data.error ?? 'Could not generate a draft right now.');
        return;
      }
      setCompose(data.draft);
    } catch {
      setDraftNotice('Could not generate a draft right now.');
    } finally {
      setDraftBusy(false);
    }
  }

  const filteredDirectory = (directory ?? []).filter((e) => {
    if (filter !== 'all' && e.role !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.orgName.toLowerCase().includes(q) || e.sector.toLowerCase().includes(q) || e.location.toLowerCase().includes(q);
  });

  const showListOnMobile = !activeThreadId || tab === 'directory';

  return (
    <div className="grid h-full min-h-0 gap-4 sm:grid-cols-[20rem_1fr]">
      {/* LIST PANE — threads or directory */}
      <div className={`flex min-h-0 flex-col rounded-2xl border border-line bg-surface-1/60 ${showListOnMobile ? 'flex' : 'hidden sm:flex'}`}>
        <div className="flex gap-1 border-b border-line p-2">
          <button
            onClick={() => setTab('messages')}
            className={`tap flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'messages' ? 'bg-white text-black' : 'text-text-2 hover:bg-white/5'}`}
          >
            Messages
          </button>
          <button
            onClick={() => setTab('directory')}
            className={`tap flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'directory' ? 'bg-white text-black' : 'text-text-2 hover:bg-white/5'}`}
          >
            Directory
          </button>
        </div>

        {tab === 'messages' ? (
          <div className="flex-1 overflow-y-auto p-2">
            {threads.length === 0 && (
              <p className="p-3 text-sm text-text-3">
                No conversations yet. Open the Directory tab to find a business or government partner and say hello.
              </p>
            )}
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id, t.otherName)}
                className={`tap mb-1 flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left ${activeThreadId === t.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <span className="mt-0.5 text-lg" aria-hidden="true">{ROLE_ICON[t.otherRole] ?? '👤'}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{t.otherName}</span>
                    {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-status-error" aria-label="Unread" />}
                  </span>
                  <span className="block truncate text-xs text-text-3">
                    {t.lastMessage ? `${t.mine ? 'You: ' : ''}${t.lastMessage}` : 'Say hello'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid gap-2 border-b border-line p-2.5">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organisations, sectors, countries…"
                className="min-h-[38px] rounded-lg border border-line bg-surface-2 px-3 text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`tap rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      filter === f ? 'border-text bg-white text-black' : 'border-line text-text-2 hover:bg-white/5'
                    }`}
                  >
                    {f === 'all' ? 'All' : ROLE_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {directoryError && <p className="p-3 text-sm text-status-error">{directoryError}</p>}
              {!directoryError && directory === null && <p className="p-3 text-sm text-text-3">Loading partners…</p>}
              {!directoryError && directory !== null && filteredDirectory.length === 0 && (
                <p className="p-3 text-sm text-text-3">
                  No registered business or government accounts match yet — the directory only lists real accounts, so it
                  starts out short. As {ROLE_LABEL[selfRole] ?? 'more'} partners join, they will appear here.
                </p>
              )}
              {filteredDirectory.map((e) => (
                <button
                  key={e.userId}
                  onClick={() => startThread(e)}
                  className="tap mb-1.5 flex w-full flex-col items-start gap-1 rounded-lg border border-line p-2.5 text-left hover:bg-white/5"
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      <span aria-hidden="true">{ROLE_ICON[e.role]}</span> {e.orgName}
                    </span>
                    {e.score > 0 && (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-text-2">
                        {e.label}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-text-3">{e.subtitle} · {e.location}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CHAT PANE */}
      <div className={`flex min-h-0 flex-col rounded-2xl border border-line bg-surface-1/60 ${!showListOnMobile ? 'flex' : 'hidden sm:flex'}`}>
        {!activeThreadId ? (
          <div className="grid flex-1 place-items-center p-8 text-center text-sm text-text-3">
            Select a conversation, or open the Directory to start one with a business or government partner.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-line p-3">
              <button onClick={() => setActiveThreadId(null)} className="tap rounded-lg border border-line px-2 py-1.5 text-sm sm:hidden" aria-label="Back to list">←</button>
              <p className="font-semibold">{activeName}</p>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
              {messages === null && <p className="text-sm text-text-3">Loading…</p>}
              {messages?.length === 0 && (
                <p className="text-sm text-text-3">No messages yet — say hello, or use “Suggest opening message” below.</p>
              )}
              {messages?.map((m) => (
                <div key={m.id} className={`msg-enter mb-2 ${m.mine ? 'text-right' : ''}`}>
                  <p className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-left text-sm ${
                    m.mine ? 'bg-white text-black' : 'border border-line bg-bg/40'
                  }`}>
                    {m.body}
                  </p>
                </div>
              ))}
            </div>

            {draftNotice && <p className="border-t border-line px-3 pt-2 text-xs text-text-3">{draftNotice}</p>}

            <div className="border-t border-line p-3">
              <div className="mb-2 flex justify-end">
                <button
                  onClick={requestDraft}
                  disabled={draftBusy}
                  className="tap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-white/5 disabled:opacity-40"
                >
                  {draftBusy ? <span className="typing-dots"><i /><i /><i /></span> : '✨ Suggest opening message'}
                </button>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex gap-2"
              >
                <textarea
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1}
                  placeholder="Write a message…"
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm"
                />
                <button type="submit" disabled={sending || !compose.trim()} className="glow-btn min-h-[42px] shrink-0 rounded-lg px-4 text-sm font-semibold disabled:opacity-40">
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
