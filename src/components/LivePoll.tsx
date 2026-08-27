'use client';

import { useEffect, useRef, useState } from 'react';
import { PILLARS } from '@/lib/mapData';

type Tally = Record<string, number>;

const SERIES = ['var(--color-series-1)', 'var(--color-series-2)', 'var(--color-series-3)', 'var(--color-series-4)', 'var(--color-series-5)'];

export function LivePoll() {
  const [tally, setTally] = useState<Tally>(() => Object.fromEntries(PILLARS.map((p) => [p.id, 0])));
  const [myVote, setMyVote] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    async function fetchTally() {
      try {
        const res = await fetch('/api/votes', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTally(data.tally ?? {});
        }
      } catch {
        // network/DB unavailable — chart just stays at its last known values
      }
    }

    if (wsUrl) {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'tally') setTally(data.tally);
          } catch {
            /* ignore malformed frame */
          }
        };
        return () => ws.close();
      } catch {
        // fall through to polling below
      }
    }

    fetchTally();
    pollTimer.current = setInterval(fetchTally, 6000);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  async function vote(pillarId: string) {
    setMyVote(pillarId);
    setTally((t) => ({ ...t, [pillarId]: (t[pillarId] ?? 0) + 1 }));
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pillarId })
      });
    } catch {
      // optimistic local increment already applied; server reconciles on next poll
    }
  }

  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(tally));

  return (
    <div className="grid gap-4 rounded-3xl border border-line bg-surface-2/80 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Live audience poll</h3>
        <span className={`text-xs font-semibold ${connected ? 'text-status-complete' : 'text-text-3'}`}>
          {connected ? '● live' : '○ polling'}
        </span>
      </div>
      <p className="text-sm text-text-2">Which pillar should your region prioritise first?</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Poll options">
        {PILLARS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => vote(p.id)}
            aria-pressed={myVote === p.id}
            className={`min-h-[40px] rounded-full border px-3 text-sm font-semibold transition ${
              myVote === p.id ? 'border-brand-cyan bg-brand-cyan/15 text-white' : 'border-line bg-surface-3 text-text-2'
            }`}
          >
            {p.icon} {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {PILLARS.map((p, i) => {
          const value = tally[p.id] ?? 0;
          const pct = (value / max) * 100;
          return (
            <div key={p.id} className="grid grid-cols-[8rem_1fr_auto] items-center gap-2">
              <span className="truncate text-sm text-text-2">{p.name}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-r transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%`, background: SERIES[i % SERIES.length] }}
                />
              </span>
              <span className="font-mono text-sm font-semibold">{value}</span>
            </div>
          );
        })}
      </div>

      <p className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3 text-xs text-text-3">
        <span>{total} responses</span>
        <span className="max-w-xs">Live if the real-time server is reachable, otherwise refreshed every 6 seconds.</span>
      </p>
    </div>
  );
}
