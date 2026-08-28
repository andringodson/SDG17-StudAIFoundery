'use client';

import { useEffect, useState } from 'react';

interface Partnership {
  id: string;
  source: 'builder' | 'connect';
  title: string;
  detail: string;
  partnerUserId: string | null;
  status: 'proposed' | 'active' | 'completed';
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<Partnership['status'], string> = { proposed: 'Proposed', active: 'Active', completed: 'Completed' };
const STATUS_COLOR: Record<Partnership['status'], string> = {
  proposed: 'text-status-warn border-status-warn/40',
  active: 'text-brand-cyan border-brand-cyan/40',
  completed: 'text-status-complete border-status-complete/40'
};
const NEXT_STATUS: Record<Partnership['status'], Partnership['status'] | null> = {
  proposed: 'active',
  active: 'completed',
  completed: null
};

/**
 * My Partnerships: real, user-tracked accountability for partnerships that
 * started life either as a Partnership Builder plan or a Connect thread —
 * see src/app/api/partnerships/route.ts for why this exists. Every entry
 * here was saved by hand by the person it belongs to; nothing is generated.
 */
export function PartnershipsPanel() {
  const [items, setItems] = useState<Partnership[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/partnerships', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { partnerships: [] }))
      .then((d) => setItems(d.partnerships ?? []))
      .catch(() => setItems([]));
  }, []);

  async function advance(p: Partnership) {
    const next = NEXT_STATUS[p.status];
    if (!next || busyId) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/partnerships/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next })
      });
      if (res.ok) {
        const { partnership } = await res.json();
        setItems((list) => list?.map((x) => (x.id === p.id ? partnership : x)) ?? list);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    setItems((list) => list?.filter((x) => x.id !== id) ?? list); // optimistic
    try {
      await fetch(`/api/partnerships/${id}`, { method: 'DELETE' });
    } finally {
      setBusyId(null);
    }
  }

  if (items === null) return null; // avoids a flash of "no partnerships" before the fetch resolves

  return (
    <div className="mt-8 rounded-xl border border-line bg-surface-1/60 p-5">
      <h2 className="font-semibold">My partnerships</h2>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-text-2">
          Nothing tracked yet. Save a plan from the Partnership Builder, or a conversation from Connect, and it
          shows up here so you can move it from proposed to active to completed as it actually happens.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((p) => (
            <li key={p.id} className="tap flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden="true">{p.source === 'connect' ? '💬' : '🧩'}</span>
                  <span className="truncate">{p.title}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLOR[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-text-3">{p.detail}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {NEXT_STATUS[p.status] && (
                  <button
                    onClick={() => advance(p)}
                    disabled={busyId === p.id}
                    className="tap rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-white/5 disabled:opacity-40"
                  >
                    Mark {STATUS_LABEL[NEXT_STATUS[p.status]!].toLowerCase()}
                  </button>
                )}
                <button
                  onClick={() => remove(p.id)}
                  disabled={busyId === p.id}
                  aria-label="Remove"
                  className="tap rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-text-3 hover:bg-white/5 disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
