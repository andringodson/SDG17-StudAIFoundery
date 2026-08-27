export function Stepper({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-3">
        Step {step} of {total} — {labels[step - 1]}
      </p>
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-text' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {step === total ? 'Final step.' : `Registration step ${step} of ${total}.`}
      </p>
    </div>
  );
}
