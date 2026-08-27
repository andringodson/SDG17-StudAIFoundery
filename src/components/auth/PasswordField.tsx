'use client';

import { useId, useState } from 'react';
import { checkPassword } from '@/lib/passwordStrength';

const STRENGTH_LABEL: Record<string, string> = { weak: 'Weak', medium: 'Medium', strong: 'Strong' };
const STRENGTH_COLOR: Record<string, string> = {
  weak: 'bg-status-error',
  medium: 'bg-status-warn',
  strong: 'bg-status-complete'
};

export function PasswordField({
  label,
  value,
  onChange,
  showStrength = false,
  autoComplete = 'new-password'
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  showStrength?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const check = showStrength ? checkPassword(value) : null;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-text-2">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="w-full min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 pr-16 text-base"
          aria-describedby={showStrength ? `${id}-strength` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-text-3 hover:text-text"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {showStrength && value.length > 0 && check && (
        <div id={`${id}-strength`} aria-live="polite">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  (check.strength === 'weak' && i === 0) ||
                  (check.strength === 'medium' && i <= 1) ||
                  check.strength === 'strong'
                    ? STRENGTH_COLOR[check.strength]
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-text-3">
            Strength: <span className="font-semibold text-text-2">{STRENGTH_LABEL[check.strength]}</span>
            {check.missing.length > 0 && ` — needs ${check.missing.join(', ')}`}
          </p>
        </div>
      )}
    </div>
  );
}
