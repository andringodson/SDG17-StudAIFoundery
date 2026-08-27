'use client';

import { useMemo, useState } from 'react';
import { ecosystemModel, type Stakeholder } from '@/lib/formulas';
import { formatINR } from '@/lib/inr';
import { useStatusBar } from '@/components/statusbar/StatusBarContext';

const STAKEHOLDERS: { id: Stakeholder; icon: string; name: string; note: string }[] = [
  { id: 'government', icon: '🏛️', name: 'Government', note: 'Mandate, regulation, scale' },
  { id: 'enterprise', icon: '🏢', name: 'Private Enterprise', note: 'Capital and operational discipline' },
  { id: 'ngo', icon: '🤝', name: 'NGO', note: 'Trust and last-mile delivery' },
  { id: 'university', icon: '🎓', name: 'University', note: 'Evidence, R&D, training' },
  { id: 'international', icon: '🌐', name: 'International Body', note: 'Convening power, standards' },
  { id: 'community', icon: '🏘️', name: 'Local Community', note: 'Legitimacy and lived context' }
];

const BUDGETS = [1_00_000, 10_00_000, 1_00_00_000, 10_00_00_000, 50_00_00_000, 1_00_00_00_000];

export function EcosystemBuilder() {
  const [selected, setSelected] = useState<Stakeholder[]>([]);
  const [budget, setBudget] = useState(BUDGETS[2]!);
  const [reportKey, setReportKey] = useState(0);
  const { run } = useStatusBar();

  const result = useMemo(() => ecosystemModel(selected, budget), [selected, budget]);

  function toggle(id: Stakeholder) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function generate() {
    try {
      await run({
        title: 'Building partnership matrix',
        detail: `${selected.length} stakeholders · ${formatINR(budget)}`,
        doneText: `Partnership strength ${result.score}%`,
        steps: [
          { label: 'Mapping stakeholder capabilities', weight: 2, work: (ctx) => tick(ctx.progress, 480) },
          { label: 'Testing coverage against budget scale', weight: 2, work: (ctx) => tick(ctx.progress, 520) },
          { label: 'Scoring partnership strength', weight: 3, work: (ctx) => tick(ctx.progress, 640) }
        ]
      });
      setReportKey((k) => k + 1);
    } catch {
      // status bar already surfaced it
    }
  }

  return (
    <div className="grid gap-6 rounded-3xl border border-line bg-surface-2/80 p-6">
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-3">Select stakeholders</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {STAKEHOLDERS.map((s) => {
            const active = selected.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={active}
                data-active={active}
                className={`glow-card grid gap-0.5 rounded-2xl border p-3 text-left ${
                  active ? 'border-brand-cyan bg-brand-cyan/10' : 'border-line bg-bg/40'
                }`}
              >
                <span className="text-xl" aria-hidden="true">{s.icon}</span>
                <span className="font-bold">{s.name}</span>
                <span className="text-xs text-text-3">{s.note}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-3">Budget allocation</h4>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBudget(b)}
              aria-pressed={b === budget}
              className={`min-h-[40px] rounded-full border px-3 text-sm font-semibold ${
                b === budget ? 'border-brand-cyan bg-brand-cyan/15 text-white' : 'border-line bg-surface-3 text-text-2'
              }`}
            >
              {formatINR(b)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={generate}
          disabled={selected.length === 0}
          className="glow-btn min-h-[44px] rounded-full px-5 font-bold"
        >
          Generate strategy report
        </button>
        {selected.length === 0 && <p className="text-sm text-text-3">Select at least one stakeholder to continue.</p>}
      </div>

      {reportKey > 0 && (
        <div key={reportKey} className="grid gap-3 rounded-2xl border border-line bg-bg/40 p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-text-3">Partnership strength</h4>
            <span className="font-mono text-3xl font-extrabold text-brand-green">{result.score}%</span>
          </div>
          {result.warnings.length > 0 ? (
            <ul className="grid gap-2">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl border-l-2 border-status-warn bg-status-warn/10 px-3 py-2 text-sm text-text-2">
                  <span aria-hidden="true">⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border-l-2 border-status-complete bg-status-complete/10 px-3 py-2 text-sm text-text-2">
              No structural gaps detected in this partnership mix.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function tick(progress: (f: number) => void, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now: number) {
      const t = Math.min(1, (now - start) / ms);
      progress(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
