'use client';

import { useEffect, useState } from 'react';

interface Ticket {
  id: string;
  reference: string;
  category: string;
  description: string;
  current_page: string | null;
  contact_email: string | null;
  contact_consent: boolean;
  status: 'received' | 'in_review' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

const STATUSES: Ticket['status'][] = ['received', 'in_review', 'resolved', 'closed'];
const STATUS_LABEL: Record<Ticket['status'], string> = {
  received: 'Received', in_review: 'In Review', resolved: 'Resolved', closed: 'Closed'
};

export function AdminSupportPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(status: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/support?status=${status}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not load support tickets.'); return; }
      setTickets(data.tickets);
      setCounts(data.counts);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]);

  async function updateStatus(id: string, status: Ticket['status']) {
    const prev = tickets;
    setTickets((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await fetch(`/api/admin/support/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
    });
    if (!res.ok) setTickets(prev);
    else load(filter);
  }

  return (
    <section className="mt-8 rounded-xl border border-line bg-surface-1/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Support Tickets</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {(['all', ...STATUSES] as const).map((s) => (
            <button
              key={s} type="button" onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 font-semibold ${filter === s ? 'border-text bg-white/10' : 'border-line text-text-2'}`}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s]}{s !== 'all' && counts[s] !== undefined ? ` (${counts[s]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {loading && <p className="mt-3 text-sm text-text-3">Loading…</p>}
      {!loading && !error && tickets.length === 0 && <p className="mt-3 text-sm text-text-3">No tickets in this view.</p>}

      <div className="mt-4 grid gap-3">
        {tickets.map((t) => (
          <div key={t.id} className="rounded-lg border border-line bg-bg/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold">{t.reference}</p>
                <p className="text-xs text-text-3">{t.category} · {new Date(t.created_at).toLocaleString()}{t.current_page ? ` · ${t.current_page}` : ''}</p>
              </div>
              <select
                value={t.status}
                onChange={(e) => updateStatus(t.id, e.target.value as Ticket['status'])}
                className="min-h-[36px] rounded-lg border border-line bg-surface-2 px-2 text-sm"
                aria-label={`Status for ${t.reference}`}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <p className="mt-2 text-sm text-text-2">{t.description}</p>
            {t.contact_consent && t.contact_email && (
              <p className="mt-2 text-xs text-text-3">Contact (opted in): {t.contact_email}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
