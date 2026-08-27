'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { authErrorMessage } from '@/lib/authErrors';

type Result = { reference: string; status: string; confirmationDelivered: boolean; smsDelivered: boolean };

export default function SupportPage() {
  const [category, setCategory] = useState('technical');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [lookup, setLookup] = useState('');
  const [lookupResult, setLookupResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, description, currentPage: document.referrer || window.location.pathname, contactEmail: email || undefined, contactPhone: phone || undefined, contactConsent: consent }) });
      const data = await response.json();
      if (!response.ok) return setError(authErrorMessage(data.code ?? data.error));
      setResult(data); setDescription('');
    } catch { setError('Unable to create the request. Please try again.'); } finally { setBusy(false); }
  }

  async function checkStatus(event: FormEvent) {
    event.preventDefault(); setLookupResult('');
    const response = await fetch(`/api/support?reference=${encodeURIComponent(lookup.toUpperCase())}`);
    const data = await response.json();
    setLookupResult(response.ok ? `${data.reference}: ${data.status.replace('_', ' ')}.` : authErrorMessage(data.code ?? data.error));
  }

  return <main id="main" className="mx-auto w-[min(100%-2.5rem,52rem)] py-14 sm:py-20">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-cyan">Support centre</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-tight">Report a problem</h1>
    <p className="mt-3 max-w-[62ch] text-text-2">Send a concise report without passwords, financial information, or private documents. A reference number lets you check its status later.</p>
    <div className="mt-8 grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-surface-1/80 p-5">
        <label className="grid gap-1.5 text-sm font-semibold text-text-2">Issue category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-text"><option value="technical">Technical issue</option><option value="account">Account access</option><option value="partnership-builder">Partnership Builder</option><option value="map">Global map</option><option value="other">Other</option></select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-text-2">What happened?
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} maxLength={4000} required className="min-h-32 rounded-lg border border-line bg-surface-2 p-3 text-text" placeholder="Describe the issue and what you expected to happen." />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-text-2">Email for follow-up (optional)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!consent} className="min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-text disabled:opacity-50" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-text-2">Phone for follow-up (optional)
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!consent} placeholder="+91 XXXXXXXXXX" className="min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-text disabled:opacity-50" />
        </label>
        <label className="flex gap-2 text-sm text-text-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to being contacted about this request.</label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {/* Whether a confirmation actually sent is worth telling the person,
            because it changes what they should do next (save the reference vs.
            watch their inbox). WHY it didn't send is not — that is our
            infrastructure state, not theirs, and it was previously spelled out
            on this public page. */}
        {result && (
          <p role="status" className="rounded-lg border border-status-complete/40 bg-status-complete/10 p-3 text-sm text-text">
            Thanks — your report has been received and passed to the team that
            handles it. Your reference is <strong>{result.reference}</strong>.
            {result.confirmationDelivered || result.smsDelivered
              ? ' A confirmation is on its way to you.'
              : ' Please save this reference — you can use it to check the status of your report at any time.'}
          </p>
        )}
        <button disabled={busy} className="glow-btn min-h-[44px] rounded-lg font-semibold disabled:opacity-40">{busy ? 'Sending…' : 'Create support request'}</button>
      </form>
      <aside className="h-fit rounded-2xl border border-line bg-surface-1/80 p-5"><h2 className="text-lg font-semibold">Check request status</h2><p className="mt-2 text-sm text-text-2">Use the reference from your submitted request.</p><form onSubmit={checkStatus} className="mt-4 grid gap-2"><input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="SDG-XXXXXXXXXX" className="min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-sm" /><button className="interactive-outline min-h-[42px] rounded-lg border border-line font-semibold">Check status</button></form>{lookupResult && <p className="mt-3 text-sm text-text-2" role="status">{lookupResult}</p>}<Link href="/" className="mt-6 inline-block text-sm font-semibold text-text underline">Back to home</Link></aside>
    </div>
  </main>;
}
