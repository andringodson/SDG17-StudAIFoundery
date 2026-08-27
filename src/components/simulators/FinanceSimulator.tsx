'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  financeModel,
  sliderToBudget,
  budgetToSlider,
  FINANCE_DEFAULT
} from '@/lib/formulas';
import { formatINR, formatINRShort, formatCount } from '@/lib/inr';
import { useStatusBar } from '@/components/statusbar/StatusBarContext';

const PRESETS = [10_00_000, 1_00_00_000, 10_00_00_000, 50_00_00_000];

const CHANNELS = [
  { label: 'Grants & Aid', share: 0.28 },
  { label: 'Concessional Loans', share: 0.21 },
  { label: 'Private Capital', share: 0.34 },
  { label: 'Domestic Revenue', share: 0.12 },
  { label: 'Blended Finance', share: 0.05 }
];

const SERIES = ['var(--color-series-1)', 'var(--color-series-2)', 'var(--color-series-3)', 'var(--color-series-4)', 'var(--color-series-5)'];

export function FinanceSimulator() {
  const [pos, setPos] = useState(() => budgetToSlider(FINANCE_DEFAULT));
  const { run } = useStatusBar();
  const [ranOnce, setRanOnce] = useState(false);

  const budget = useMemo(() => sliderToBudget(pos), [pos]);
  const result = useMemo(() => financeModel(budget), [budget]);

  const allocation = useMemo(
    () => CHANNELS.map((c) => ({ name: c.label, value: Math.round(budget * c.share) })),
    [budget]
  );

  async function runProjection() {
    try {
      await run({
        title: 'Calculating strategy',
        detail: formatINR(budget),
        doneText: `Strategy generated — ${formatCount(result.projects)} projects, ${formatCount(result.communities)} communities`,
        steps: [
          {
            label: 'Preparing financial datasets',
            weight: 1,
            work: async (ctx) => {
              ctx.log(`${formatINR(budget)} across ${CHANNELS.length} funding channels`);
              await tick(ctx.progress, 380);
            }
          },
          {
            label: 'Validating multi-stakeholder matrix',
            weight: 2,
            work: async (ctx) => {
              await tick(ctx.progress, 520);
            }
          },
          {
            label: `Computing regional impact score`,
            weight: 3,
            work: async (ctx) => {
              await tick(ctx.progress, 700);
              ctx.log(`impact score ${result.impact}%`);
            }
          },
          {
            label: 'Finalizing report',
            weight: 1,
            work: async (ctx) => {
              await tick(ctx.progress, 320);
            }
          }
        ]
      });
      setRanOnce(true);
    } catch {
      // status bar already surfaced the failure/cancellation
    }
  }

  return (
    <div className="grid gap-6 rounded-3xl border border-line bg-gradient-to-b from-surface-2/90 to-surface-1/90 p-6 shadow-lg">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="budget-slider" className="text-xs font-bold uppercase tracking-wider text-text-3">
            Available budget
          </label>
          <div className="flex flex-wrap items-baseline gap-3">
            <motion.output
              key={Math.round(budget / 1000)}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-3xl font-extrabold text-brand-green"
            >
              {formatINRShort(budget)}
            </motion.output>
            <span className="font-mono text-xs text-text-3">{formatINR(budget)}</span>
          </div>
        </div>

        <input
          id="budget-slider"
          type="range"
          min={0}
          max={1000}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-brand-royal via-brand-cyan to-brand-green accent-brand-cyan"
          aria-describedby="budget-help"
        />
        <div className="flex justify-between font-mono text-[0.7rem] text-text-3" aria-hidden="true">
          <span>₹10 Lakh</span>
          <span>₹1 Cr</span>
          <span>₹10 Cr</span>
          <span>₹50 Cr</span>
        </div>
        <p id="budget-help" className="text-sm text-text-3">
          Range ₹10 Lakh to ₹50 Crore, logarithmic. Use arrow keys for fine control.
        </p>

        <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Budget presets">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPos(budgetToSlider(v))}
              className="min-h-[40px] rounded-full border border-line bg-surface-3 px-3 text-sm font-semibold text-text-2 transition hover:border-line-strong hover:text-text"
            >
              {formatINRShort(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Projects supported" value={formatCount(result.projects)} accent="border-t-brand-cyan" />
        <Kpi label="Communities reached" value={formatCount(result.communities)} accent="border-t-brand-green" />
        <Kpi label="Impact score" value={`${result.impact}%`} accent="border-t-status-warn" />
      </div>

      <div className="grid items-center gap-6 sm:grid-cols-2">
        <div className="mx-auto h-56 w-full max-w-xs">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={allocation} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={2}>
                {allocation.map((_, i) => (
                  <Cell key={i} fill={SERIES[i % SERIES.length]} stroke="var(--color-bg)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [formatINR(value), name]}
                contentStyle={{ background: '#0b1f33', border: '1px solid rgba(148,194,236,0.3)', borderRadius: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid gap-1.5 text-sm">
          {allocation.map((a, i) => (
            <li key={a.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: SERIES[i % SERIES.length] }} aria-hidden="true" />
              <span className="flex-1 text-text-2">{a.name}</span>
              <span className="font-mono font-semibold">{formatINR(a.value)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={runProjection}
          className="glow-btn min-h-[44px] rounded-full px-5 font-bold"
        >
          Run full projection
        </button>
        <p className="max-w-sm text-sm text-text-3">
          Runs a four-stage model against the status bar below. Press <kbd className="rounded border border-current px-1 text-xs">Esc</kbd> to cancel.
        </p>
        {ranOnce && (
          <span className="ml-auto text-sm font-semibold text-status-complete">Last run: {formatINRShort(budget)} strategy generated</span>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-2xl border border-line border-t-2 bg-bg/40 px-5 py-4 ${accent}`}>
      <p className="text-xs text-text-3">{label}</p>
      <p className="font-mono text-2xl font-extrabold tracking-tight">{value}</p>
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
