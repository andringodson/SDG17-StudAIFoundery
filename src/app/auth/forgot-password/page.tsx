'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { checkPassword } from '@/lib/passwordStrength';
import { authErrorMessage } from '@/lib/authErrors';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordInner />
    </Suspense>
  );
}

function ForgotPasswordInner() {
  const params = useSearchParams();
  const token = params.get('token');
  return token ? <ResetForm token={token} /> : <RequestForm />;
}

function RequestForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } finally {
      setSent(true);
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p role="status" className="text-sm text-text-2">
          If an account exists for this email address, a password reset link will be sent.
        </p>
        <Link href="/auth/login" className="mt-6 inline-block text-sm font-semibold text-text underline">
          Back to Log In
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" description="Enter the email address on your account.">
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-text-2">Email Address</span>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-base"
          />
        </label>
        <button type="submit" disabled={busy} className="glow-btn min-h-[44px] rounded-lg font-semibold disabled:opacity-40">
          {busy ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
    </AuthShell>
  );
}

function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const strength = checkPassword(password);
    if (!strength.valid) return setError(`Please create a stronger password — needs ${strength.missing.join(', ')}.`);
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) return setError(authErrorMessage(data.code ?? data.error));
      setDone(true);
    } catch {
      setError(authErrorMessage('network_error'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Password successfully updated.">
        <Link href="/auth/login" className="glow-btn flex min-h-[44px] items-center justify-center rounded-lg font-semibold">
          Log In
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset Password">
      <form onSubmit={submit} className="grid gap-4">
        <PasswordField label="New Password" value={password} onChange={setPassword} showStrength />
        <PasswordField label="Confirm Password" value={confirm} onChange={setConfirm} />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="glow-btn min-h-[44px] rounded-lg font-semibold disabled:opacity-40">
          {busy ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </AuthShell>
  );
}
