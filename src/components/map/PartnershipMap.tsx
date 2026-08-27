'use client';

import { useMemo, useState } from 'react';
import { REGIONS, LINKS, LANDMASSES, PILLARS, type Region } from '@/lib/mapData';
import { formatCount } from '@/lib/inr';

const VB_W = 1000;
const VB_H = 500;

function project(lon: number, lat: number) {
  return { x: ((lon + 180) / 360) * VB_W, y: ((90 - lat) / 180) * VB_H };
}

function regionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function PartnershipMap() {
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const maxProjects = Math.max(...REGIONS.map((r) => r.projects));
  const maxFunding = Math.max(...REGIONS.map((r) => r.funding));
  const activeRegion = selected ? regionById(selected) : null;

  const visibleCount = useMemo(
    () => REGIONS.filter((r) => filter === 'all' || r.categories.includes(filter)).length,
    [filter]
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter partnerships by pillar">
        <FilterChip label="All partnerships" active={filter === 'all'} onClick={() => setFilter('all')} />
        {PILLARS.map((p) => (
          <FilterChip key={p.id} label={p.name} active={filter === p.id} onClick={() => setFilter(p.id)} />
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {visibleCount} of {REGIONS.length} regions match this filter.
      </p>

      <div className="flex flex-wrap gap-4">
        <div className="glow-card partnership-map min-w-[min(100%,34rem)] flex-[999] rounded-3xl border border-line bg-surface-1/80 p-4">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" role="group" aria-label="Interactive world map of partnership activity">
            <defs>
              <linearGradient id="connectionFlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#00aed6" stopOpacity="0.2" />
                <stop offset="0.5" stopColor="#85e6ff" stopOpacity="0.95" />
                <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.25" />
              </linearGradient>
              <filter id="connectionGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g aria-hidden="true" opacity={0.5}>
              {LANDMASSES.map((mass) => (
                <polygon
                  key={mass.id}
                  points={mass.points.map(([lon, lat]) => { const p = project(lon, lat); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ')}
                  fill="rgb(255 255 255 / 0.06)"
                  stroke="rgb(255 255 255 / 0.16)"
                  strokeWidth={1}
                />
              ))}
            </g>

            <g aria-hidden="true">
              {LINKS.map(([aId, bId], i) => {
                const a = regionById(aId);
                const b = regionById(bId);
                if (!a || !b) return null;
                const p = project(...a.pos);
                const q = project(...b.pos);
                const mx = (p.x + q.x) / 2;
                const my = (p.y + q.y) / 2 - Math.abs(q.x - p.x) * 0.18 - 14;
                const dimmed = filter !== 'all' && !(a.categories.includes(filter) && b.categories.includes(filter));
                const d = `M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}`;
                return <g key={i}>
                  <path d={d} fill="none" stroke="#9edfff" strokeWidth={1.2} strokeDasharray="5 9" opacity={dimmed ? 0.05 : 0.28} />
                  {!dimmed && <path className="map-connection-flow" d={d} fill="none" stroke="url(#connectionFlow)" strokeWidth={2.2} strokeDasharray="8 46" opacity="0.9" filter="url(#connectionGlow)" style={{ animationDelay: `${i * -0.7}s` }} />}
                </g>;
              })}
            </g>

            <g>
              {REGIONS.map((region) => {
                const p = project(...region.pos);
                const r = 12 + Math.sqrt(region.projects / maxProjects) * 20;
                const step = 1 + Math.round((region.funding / maxFunding) * 4);
                const dimmed = filter !== 'all' && !region.categories.includes(filter);
                const isSel = selected === region.id;
                return (
                  <g
                    key={region.id}
                    role="button"
                    tabIndex={dimmed ? -1 : 0}
                    aria-hidden={dimmed}
                    aria-label={`${region.name}: ${formatCount(region.projects)} projects, ${region.partners} partners, ₹${formatCount(region.funding)} crore committed`}
                    onClick={() => !dimmed && setSelected(region.id)}
                    onKeyDown={(e) => { if (!dimmed && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelected(region.id); } }}
                    style={{ cursor: dimmed ? 'default' : 'pointer', opacity: dimmed ? 0.22 : 1 }}
                  >
                    <circle className="map-node-pulse" cx={p.x} cy={p.y} r={r + 13} fill="#41d8ff" opacity={isSel ? 0.2 : 0.09} style={{ animationDelay: `${step * -0.6}s` }} />
                    <circle
                      cx={p.x} cy={p.y} r={r}
                      fill={`var(--seq-${step}, var(--color-brand-royal))`}
                      stroke={isSel ? '#dff8ff' : 'rgb(121 221 255 / 0.7)'}
                      strokeWidth={isSel ? 3 : 2}
                      style={{ ['--seq-1' as string]: '#12406e', ['--seq-2' as string]: '#1a5fa0', ['--seq-3' as string]: '#2a78d6', ['--seq-4' as string]: '#5b9ae8', ['--seq-5' as string]: '#8fbcf2' }}
                    />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill={step <= 2 ? '#EAF3FB' : '#04212C'} fontFamily="var(--font-mono)">
                      {region.projects >= 1000 ? `${(region.projects / 1000).toFixed(1)}K` : region.projects}
                    </text>
                    <text x={p.x} y={p.y + r + 18} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--color-text-2)">
                      {region.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          <p className="mt-2 flex items-center gap-2 text-sm text-text-3">
            <span
              className="h-2 w-14 flex-none rounded-full"
              style={{ background: 'linear-gradient(90deg,#12406e,#2a78d6,#8fbcf2)' }}
              aria-hidden="true"
            />
            Circle size shows active projects; shade shows committed funding. Flowing traces show active regional connections. Select a region for detail.
          </p>
        </div>

        {activeRegion && (
          <aside className="glow-card min-w-[18rem] flex-1 rounded-3xl border border-line bg-surface-1/80 p-5" aria-label="Regional profile">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-3">Regional profile</p>
                <h3 className="text-2xl font-extrabold">{activeRegion.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close regional profile"
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-text-2 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-text-2">{activeRegion.focus}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              <Stat label="Active projects" value={formatCount(activeRegion.projects)} />
              <Stat label="Partner organisations" value={formatCount(activeRegion.partners)} />
              <Stat label="Committed funding" value={`₹${formatCount(activeRegion.funding)} Cr`} />
              <Stat label="Population reach" value={`${activeRegion.reach}%`} />
            </dl>
            <h4 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-text-3">Partner organisations</h4>
            <ul className="grid gap-1">
              {activeRegion.orgs.map((o) => (
                <li key={o} className="rounded-r border-l-2 border-white/25 bg-bg/40 px-3 py-1.5 text-sm text-text-2">
                  {o}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] rounded-full border px-3 text-sm font-semibold transition ${
        active ? 'border-text bg-white/10 text-text' : 'border-line bg-surface-3 text-text-2 hover:border-line-strong'
      }`}
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-3">
      <p className="font-mono text-lg font-bold">{value}</p>
      <p className="text-xs text-text-3">{label}</p>
    </div>
  );
}
