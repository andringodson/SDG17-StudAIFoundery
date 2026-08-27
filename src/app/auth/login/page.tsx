'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { authErrorMessage } from '@/lib/authErrors';

const ROLE_HOME: Record<string, string> = {
  company: '/dashboard/company',
  investor: '/dashboard/investor',
  general_user: '/dashboard/general',
  admin: '/dashboard/restricted',
  compliance_admin: '/dashboard/restricted'
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const expired = useSearchParams().get('expired') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password, remember })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'too_many_attempts') setRetryAfter(data.retryAfterSeconds ?? 60);
        setError(authErrorMessage(data.code ?? data.error));
        return;
      }
      router.push(ROLE_HOME[data.user.role] ?? '/dashboard/general');
    } catch {
      setError(authErrorMessage('network_error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome Back" description="Continue building partnerships and creating opportunities.">
      {expired && (
        <p role="alert" className="mb-4 rounded-lg border border-status-warn/40 bg-status-warn/10 px-3 py-2 text-sm text-text-2">
          Your session has expired. Please log in again.
        </p>
      )}
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-text-2">Email Address</span>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-base" required autoComplete="username"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-text-2">Password</span>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-base" required autoComplete="current-password"
          />
        </label>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-text-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4" />
            Remember Me
          </label>
          <Link href="/auth/forgot-password" className="font-semibold text-text-2 underline hover:text-text">
            Forgot Password?
          </Link>
        </div>

        {error && (
          <div role="alert" className="grid gap-2 text-sm text-red-300">
            <p>{error}{retryAfter > 0 && ` Try again in ${retryAfter}s.`}</p>
            {error === authErrorMessage('email_registered') && (
              <div className="flex gap-3">
                <Link href="/auth/login" className="underline">Log In</Link>
                <Link href="/auth/forgot-password" className="underline">Reset Password</Link>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={busy || retryAfter > 0} className="glow-btn min-h-[44px] rounded-lg font-semibold disabled:opacity-40">
          {busy ? 'Logging in…' : 'Log In'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-text-3">
        <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          disabled
          aria-disabled
          title="Google sign-in needs a Google OAuth app registered by the site owner — not yet configured."
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-line text-sm font-semibold text-text-3 opacity-50"
        >
          Continue with Google (coming soon)
        </button>
        <button
          type="button"
          disabled
          aria-disabled
          title="Microsoft sign-in needs an Azure AD app registered by the site owner — not yet configured."
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-line text-sm font-semibold text-text-3 opacity-50"
        >
          Continue with Microsoft (coming soon)
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-text-3">
        Don&apos;t have an account? <Link href="/auth/register" className="font-semibold text-text underline">Create Account</Link>
      </p>
    </AuthShell>
  );
}
