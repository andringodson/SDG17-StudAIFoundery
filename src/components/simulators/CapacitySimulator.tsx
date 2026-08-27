'use client';

import { useState } from 'react';

const ROLES = {
  student: { icon: '🧑‍🎓', name: 'Student', steps: ['SDG literacy foundations', 'Data analysis for impact', 'Campus partnership project', 'Youth policy advocacy', 'Lead a community pilot'] },
  teacher: { icon: '🧑‍🏫', name: 'Teacher', steps: ['Embed SDGs in curriculum', 'Project-based learning design', 'Inclusive classroom practice', 'Mentor a student cohort', 'Train fellow educators'] },
  ngo: { icon: '🤝', name: 'NGO Worker', steps: ['Community needs assessment', 'Monitoring & evaluation basics', 'Grant writing and reporting', 'Multi-stakeholder facilitation', 'Scale a proven model'] },
  govt: { icon: '🏛️', name: 'Govt. Official', steps: ['SDG indicator frameworks', 'Budget tagging for SDGs', 'Cross-ministry coordination', 'Open data publication', 'Policy coherence review'] },
  entrepreneur: { icon: '🚀', name: 'Entrepreneur', steps: ['Impact business modelling', 'Blended finance instruments', 'Supply-chain due diligence', 'Impact measurement standards', 'Raise a sustainability round'] }
} as const;

type RoleId = keyof typeof ROLES;

export function CapacitySimulator() {
  const [roleId, setRoleId] = useState<RoleId>('student');
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const role = ROLES[roleId];
  const allDone = completed.size === role.steps.length;

  function selectRole(id: RoleId) {
    setRoleId(id);
    setCompleted(new Set());
  }

  function toggleStep(i: number) {
    setCompleted((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-surface-2/80 p-6">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose a role">
        {(Object.keys(ROLES) as RoleId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => selectRole(id)}
            aria-pressed={roleId === id}
            className={`min-h-[40px] rounded-full border px-3 text-sm font-semibold transition ${
              roleId === id ? 'border-brand-cyan bg-brand-cyan/15 text-white' : 'border-line bg-surface-3 text-text-2'
            }`}
          >
            {ROLES[id].icon} {ROLES[id].name}
          </button>
        ))}
      </div>

      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-3">{role.name} pathway</h4>
      <ol className="grid gap-2">
        {role.steps.map((step, i) => {
          const done = completed.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggleStep(i)}
                aria-pressed={done}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  done ? 'border-status-complete/50 bg-status-complete/10' : 'border-line bg-bg/40'
                }`}
              >
                <span
                  className={`num-badge h-7 w-7 text-sm ${done ? '' : 'opacity-60'}`}
                  aria-hidden="true"
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="flex-1 font-semibold">{step}</span>
                <span className="text-xs text-text-3">Stage {i + 1} of {role.steps.length}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!allDone}
          className="glow-btn min-h-[44px] rounded-full px-5 font-bold disabled:opacity-40"
        >
          Print certificate
        </button>
        <p className="text-sm text-text-3">
          {allDone ? 'All stages complete — printing opens a certificate you can save as PDF.' : 'Complete every stage to unlock the certificate.'}
        </p>
      </div>

      {allDone && (
        <div className="certificate-print hidden">
          <div className="border-4 border-brand-royal p-12 text-center">
            <p className="text-sm uppercase tracking-widest text-brand-royal">SDG 17 · Global Partnership Platform</p>
            <h2 className="my-4 text-3xl font-extrabold">Certificate of Completion</h2>
            <p className="text-lg">This certifies completion of the</p>
            <p className="my-2 text-2xl font-bold">{role.name} Learning Pathway</p>
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .certificate-print, .certificate-print * { visibility: visible; }
          .certificate-print { display: block !important; position: fixed; inset: 0; }
        }
      `}</style>
    </div>
  );
}
