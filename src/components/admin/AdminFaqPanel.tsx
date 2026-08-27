'use client';

import { useEffect, useState, type FormEvent } from 'react';

interface Faq {
  id: string;
  keywords: string[];
  response: string;
  action_label: string | null;
  action_href: string | null;
  is_active: boolean;
  updated_at: string;
}

export function AdminFaqPanel() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [response, setResponse] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionHref, setActionHref] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/faqs');
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not load assistant FAQs.'); return; }
      setFaqs(data.faqs);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          response,
          actionLabel: actionLabel || undefined,
          actionHref: actionHref || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not save that FAQ.'); return; }
      setKeywords(''); setResponse(''); setActionLabel(''); setActionHref('');
      load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(faq: Faq) {
    setFaqs((f) => f.map((x) => (x.id === faq.id ? { ...x, is_active: !x.is_active } : x)));
    await fetch(`/api/admin/faqs/${faq.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !faq.is_active })
    });
  }

  async function remove(id: string) {
    setFaqs((f) => f.filter((x) => x.id !== id));
    await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
  }

  return (
    <section className="mt-6 rounded-xl border border-line bg-surface-1/60 p-5">
      <h2 className="font-semibold">Assistant Knowledge Base</h2>
      <p className="mt-1 text-sm text-text-2">
        These answers are matched by keyword alongside the assistant's built-in knowledge and take priority on a tie —
        add or fix an answer here without a code deploy.
      </p>

      <form onSubmit={create} className="mt-4 grid gap-2 rounded-lg border border-line bg-bg/40 p-4">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-text-2">Keywords (comma-separated)</span>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} required
            className="min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm" placeholder="e.g. certificate, download, pdf" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-text-2">Response</span>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} required rows={3}
            className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm" />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-text-2">Action label (optional)</span>
            <input value={actionLabel} onChange={(e) => setActionLabel(e.target.value)}
              className="min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm" placeholder="e.g. Open Capacity Building" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-text-2">Action link (optional)</span>
            <input value={actionHref} onChange={(e) => setActionHref(e.target.value)}
              className="min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm" placeholder="/#capacity" />
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="glow-btn mt-1 min-h-[40px] rounded-lg text-sm font-semibold disabled:opacity-40">
          {busy ? 'Saving…' : 'Add FAQ'}
        </button>
      </form>

      {loading && <p className="mt-3 text-sm text-text-3">Loading…</p>}
      {!loading && faqs.length === 0 && <p className="mt-3 text-sm text-text-3">No custom FAQs yet — the assistant is using its built-in knowledge only.</p>}

      <div className="mt-4 grid gap-2">
        {faqs.map((f) => (
          <div key={f.id} className={`rounded-lg border border-line bg-bg/40 p-3 ${f.is_active ? '' : 'opacity-50'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-semibold text-text-3">{f.keywords.join(', ')}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleActive(f)} className="rounded-lg border border-line px-2 py-1 text-xs font-semibold hover:bg-white/5">
                  {f.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" onClick={() => remove(f.id)} className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-red-300 hover:bg-white/5">
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm">{f.response}</p>
            {f.action_label && f.action_href && <p className="mt-1 text-xs text-text-3">Action: {f.action_label} → {f.action_href}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
