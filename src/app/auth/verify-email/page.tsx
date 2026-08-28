'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';

const RESEND_COOLDOWN_S = 45;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
      .catch(() => {})
      .finally(() => setCheckedSession(true));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setNotice('');
    setError('');
    const res = await fetch('/api/auth/otp/send', { method: 'POST' });
    if (res.status === 401) {
      // Not the same failure as "email isn't configured" — the earlier
      // message here claimed exactly that, which sent people down the wrong
      // path entirely when the real fix is just signing in again.
      setError('Your sign-in has expired. Please sign in again to request a new code.');
      setCooldown(0);
      return;
    }
    const data = await res.json();
    setNotice(data.delivered
      ? 'A new code has been sent to your email — check Spam/Junk if it doesn\'t show up in a minute or two.'
      : 'Email sending is not switched on for this site yet, so the code could not be delivered. Please contact the site owner to get your account verified.');
    setCooldown(RESEND_COOLDOWN_S);
  }

  async function verify() {
    setError('');
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (res.ok) {
      setVerified(true);
      setTimeout(() => router.push('/dashboard'), 1200);
      return;
    }
    if (res.status === 401) {
      setError('Your sign-in has expired. Please sign in again to verify your email.');
      return;
    }
    const data = await res.json();
    setError(data.error === 'expired' ? 'That code has expired — request a new one.' : 'That code is incorrect.');
  }

  if (verified) {
    return <AuthShell title="Email verified"><p className="text-sm text-status-complete">Redirecting to your dashboard…</p></AuthShell>;
  }

  // /api/me came back with no user: the session cookie is missing or expired,
  // so every action below would 401. Say so plainly instead of letting the
  // form fail silently into a misleading error.
  if (checkedSession && !email) {
    return (
      <AuthShell title="Verify Your Email" description="You're signed out, so there's no account here to verify.">
        <p className="mb-4 text-sm text-text-2">Sign in again and this page will pick up where you left off.</p>
        <a href="/auth/login" className="glow-btn flex min-h-[44px] items-center justify-center rounded-lg font-semibold">
          Sign in
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verify Your Email" description={email ? `We sent a verification code to: ${email}` : 'Checking your session…'}>
      <div className="grid gap-4">
        <p className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-xs text-text-3">
          Not in your inbox? Check <strong className="text-text-2">Spam/Junk</strong> — this platform currently sends
          from a shared address (onboarding@resend.dev), which some providers file there. The code is valid for 30 minutes.
        </p>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-text-2">Verification code</span>
          <input
            value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} inputMode="numeric"
            className="w-full min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 font-mono text-lg tracking-widest"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {notice && <p role="status" className="text-sm text-text-3">{notice}</p>}
        <button onClick={verify} className="glow-btn min-h-[44px] rounded-lg font-semibold">Verify</button>
        <div className="flex gap-3 text-sm">
          <button
            onClick={resend}
            disabled={cooldown > 0}
            className="flex-1 min-h-[40px] rounded-lg border border-line font-semibold disabled:opacity-40"
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Email'}
          </button>
          <a href="/dashboard" className="flex-1 flex items-center justify-center min-h-[40px] rounded-lg border border-line font-semibold">
            Change Email
          </a>
        </div>
      </div>
    </AuthShell>
  );
}
