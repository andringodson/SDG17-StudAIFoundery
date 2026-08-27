'use client';

import { useMemo, useState } from 'react';
import { tradeModel } from '@/lib/formulas';
import { formatINR } from '@/lib/inr';

export function TradeSimulator() {
  const [tradeValue, setTradeValue] = useState(2_00_00_000);
  const [barrierReductionPct, setBarrierReductionPct] = useState(40);
  const [techInvestment, setTechInvestment] = useState(1_00_00_000);

  const result = useMemo(
    () => tradeModel({ tradeValue, barrierReductionPct, techInvestment }),
    [tradeValue, barrierReductionPct, techInvestment]
  );

  return (
    <div className="grid gap-6 rounded-3xl border border-line bg-surface-2/80 p-6 sm:grid-cols-2">
      <div className="grid gap-5 content-start">
        <Slider
          label="Trade value"
          value={tradeValue}
          onChange={setTradeValue}
          min={0}
          max={20_00_00_000}
          step={5_00_000}
          format={formatINR}
          hint="Value of goods and services moving through the corridor"
        />
        <Slider
          label="Trade barrier reduction"
          value={barrierReductionPct}
          onChange={setBarrierReductionPct}
          min={0}
          max={100}
          step={1}
          format={(v) => `${v}%`}
          hint="Tariff and non-tariff barrier relief for exporters"
        />
        <Slider
          label="Tech infrastructure investment"
          value={techInvestment}
          onChange={setTechInvestment}
          min={0}
          max={10_00_00_000}
          step={5_00_000}
          format={formatINR}
          hint="Ports, cold chain, customs digitisation"
        />
      </div>

      <div className="grid content-start gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-3">Projected outcomes</h4>
        <ScoreBar label="Economic growth" value={result.growthScore} color="var(--color-series-1)" />
        <ScoreBar label="Job creation" value={result.jobsScore} color="var(--color-series-3)" />
        <ScoreBar label="Sustainability" value={result.sustainabilityScore} color="var(--color-series-4)" />
        <p className="mt-2 rounded-xl border-l-2 border-brand-cyan bg-brand-cyan/10 px-4 py-3 text-sm text-text-2">
          {verdict(result)}
        </p>
      </div>
    </div>
  );
}

function verdict(r: { growthScore: number; jobsScore: number; sustainabilityScore: number }): string {
  if (r.sustainabilityScore < 40) {
    return 'Growth is being bought at an environmental and labour cost. Raise tech investment before scaling trade volume further.';
  }
  if (r.growthScore < 40) {
    return 'Standards are fine but market access is thin — barrier reduction would let this actually move goods.';
  }
  if (Math.min(r.growthScore, r.jobsScore, r.sustainabilityScore) > 65) {
    return 'Well balanced — growth, employment and sustainability are moving together rather than trading off.';
  }
  return 'Workable, but uneven. The weakest of the three scores is what will limit this in practice.';
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  hint
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint: string;
}) {
  const id = `trade-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <span className="font-mono text-sm font-bold text-brand-cyan">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-cyan"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="mt-1 text-xs text-text-3">
        {hint}
      </p>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-text-2">{label}</span>
        <span className="font-mono font-bold">{value}%</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-r transition-[width] duration-700 ease-out"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}
