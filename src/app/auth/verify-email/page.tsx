'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';

const RESEND_COOLDOWN_S = 45;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('session_lookup_failed'); return r.json(); })
      .then((d) => {
        setSignedIn(Boolean(d.user));
        setEmail(d.user?.email ?? null);
        if (d.user?.emailVerified) { setVerified(true); router.replace('/dashboard'); }
        const sent = new URLSearchParams(window.location.search).get('sent');
        if (sent === '0') setError('We could not send your verification email. Try Resend Email. If it still fails, contact the site owner.');
        if (sent === '1') setNotice('Your code was submitted for delivery. Check your inbox and Spam/Junk.');
      })
      .catch(() => setSessionError(true))
      .finally(() => setCheckedSession(true));
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setNotice('');
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/otp/send', { method: 'POST' });
      const data = await res.json();
      if (res.status === 401) { setSignedIn(false); return; }
      if (!res.ok) {
        setError(data.error ?? 'Unable to send a code. Please try again.');
        if (res.status === 429) setCooldown(data.retryAfterSeconds ?? RESEND_COOLDOWN_S);
        return;
      }
      if (data.delivered) setNotice('Your code was submitted for delivery. Check your inbox and Spam/Junk.');
      else setError('We could not send your verification email. Please contact the site owner if this continues.');
      setCooldown(RESEND_COOLDOWN_S);
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally { setBusy(false); }
  }

  async function verify() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) { setVerified(true); router.replace('/dashboard'); return; }
      if (res.status === 401) { setSignedIn(false); return; }
      const data = await res.json();
      setError(data.error === 'expired' || data.error === 'missing'
        ? 'That code has expired or is missing — request a new one.'
        : data.error === 'mismatch' ? 'That code is incorrect.' : 'Verification failed. Please try again.');
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally { setBusy(false); }
  }

  if (sessionError) {
    return <AuthShell title="Verify Your Email" description="We could not check your session. Please try again.">
      <button onClick={() => window.location.reload()} className="glow-btn min-h-[44px] rounded-lg px-4">Try again</button>
    </AuthShell>;
  }

  if (verified) {
    return <AuthShell title="Email verified"><p className="text-sm text-status-complete">Redirecting to your dashboard…</p></AuthShell>;
  }

  // /api/me came back with no user: the session cookie is missing or expired,
  // so every action below would 401. Say so plainly instead of letting the
  // form fail silently into a misleading error.
  if (checkedSession && !signedIn) {
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
    <AuthShell title="Verify Your Email" description={email ? `Verify your email address: ${email}` : checkedSession ? 'This account has no email address. Add one from your dashboard.' : 'Checking your session…'}>
      <div className="grid gap-4">
        <p className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-xs text-text-3">
          Not in your inbox? Check <strong className="text-text-2">Spam/Junk</strong> or request a new code below. The code is valid for 30 minutes.
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
        <button disabled={busy || !email || !/^\d{6}$/.test(code)} onClick={verify} className="glow-btn min-h-[44px] rounded-lg font-semibold">Verify</button>
        <div className="flex gap-3 text-sm">
          <button
            onClick={resend}
            disabled={busy || !email || cooldown > 0}
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
