'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';

const RESEND_COOLDOWN_S = 45;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => setEmail(d.user?.email ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setNotice('');
    const res = await fetch('/api/auth/otp/send', { method: 'POST' });
    const data = await res.json();
    setNotice(data.delivered
      ? 'A new code has been sent to your email.'
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
    } else {
      const data = await res.json();
      setError(data.error === 'expired' ? 'That code has expired — request a new one.' : 'That code is incorrect.');
    }
  }

  if (verified) {
    return <AuthShell title="Email verified"><p className="text-sm text-status-complete">Redirecting to your dashboard…</p></AuthShell>;
  }

  return (
    <AuthShell title="Verify Your Email" description={email ? `We sent a verification code to: ${email}` : 'Sign in to verify your email.'}>
      <div className="grid gap-4">
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
