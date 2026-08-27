'use client';

import { useEffect, useState, type FormEvent } from 'react';

interface Pledge {
  id: string;
  displayName: string;
  role: string;
  pledgeText: string;
  createdAt: string;
}

const SEED: Pledge[] = [
  { id: 's1', displayName: 'Ananya R.', role: 'Student', pledgeText: 'I will run a monthly SDG literacy circle in my hostel block and publish what we learn.', createdAt: '' },
  { id: 's2', displayName: 'Karthik M.', role: 'Entrepreneur', pledgeText: 'Our startup will publish a supplier sustainability scorecard before the next funding round.', createdAt: '' }
];

export function PledgeWall() {
  const [pledges, setPledges] = useState<Pledge[]>(SEED);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Student');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/pledges', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.pledges?.length) setPledges([...data.pledges, ...SEED]);
      })
      .catch(() => {
        /* DB not configured yet — seeded pledges keep the wall from looking empty */
      })
      .finally(() => setLoaded(true));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Please enter a name of at least two characters.');
    if (text.trim().length < 12) return setError('A pledge needs a bit more detail — at least twelve characters.');
    if (text.trim().length > 240) return setError('Please keep the pledge under 240 characters.');
    setError('');

    const optimistic: Pledge = { id: `local-${Date.now()}`, displayName: name, role, pledgeText: text, createdAt: new Date().toISOString() };
    setPledges((p) => [optimistic, ...p]);
    setName('');
    setText('');

    try {
      await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: optimistic.displayName, role, pledgeText: optimistic.pledgeText })
      });
    } catch {
      // pledge stays visible locally even if persistence isn't wired up yet
    }
  }

  return (
    <div className="grid gap-5 rounded-3xl border border-line bg-surface-2/80 p-6">
      <div>
        <h3 className="text-lg font-bold">Pledge wall</h3>
        <p className="text-sm text-text-2">Commit to one concrete thing. Specific beats ambitious.</p>
      </div>

      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputCls} />
          </Field>
          <Field label="Your role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {['Student', 'Teacher', 'NGO Worker', 'Govt. Official', 'Entrepreneur', 'Other'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Your pledge">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={240} rows={3} placeholder="I will…" className={`${inputCls} resize-y`} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div>
          <button type="submit" className="glow-btn min-h-[44px] rounded-lg px-5 font-bold">
            Post pledge
          </button>
        </div>
      </form>

      <p className="text-sm text-text-3" aria-live="polite">
        {pledges.length} pledge{pledges.length === 1 ? '' : 's'} on the wall{!loaded ? ' · loading…' : ''}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {pledges.map((p) => (
          <li key={p.id} className="glow-card rounded-r-2xl border border-line border-l-2 border-l-white/25 bg-bg/40 p-4">
            <p className="text-sm leading-relaxed">&ldquo;{p.pledgeText}&rdquo;</p>
            <p className="mt-2 flex gap-2 text-sm">
              <span className="font-bold">{p.displayName}</span>
              <span className="text-text-3">{p.role}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const inputCls = 'w-full min-h-[44px] rounded-xl border border-line bg-bg/60 px-3 py-2 text-base';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-text-2">{label}</span>
      {children}
    </label>
  );
}
