'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { authErrorMessage } from '@/lib/authErrors';

interface Me {
  userId: string;
  username: string;
  role?: string;
}

export function AuthPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { username, email: email || undefined, password } : { username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(authErrorMessage(data.code ?? data.error));
        return;
      }
      setMe(data.user);
    } catch {
      setError(authErrorMessage('network_error'));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMe(null);
  }

  async function sendOtp() {
    setNotice('');
    const res = await fetch('/api/auth/otp/send', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setOtpSent(true);
      setNotice(data.delivered ? 'Code sent to your email.' : 'Email not configured yet — check the server console for the code.');
    } else {
      setNotice(data.error ?? 'Could not send a code.');
    }
  }

  async function verifyOtp() {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: otpCode })
    });
    const data = await res.json();
    setNotice(res.ok ? 'Email verified.' : `Verification failed: ${data.error}`);
  }

  async function startTelegramLink() {
    const res = await fetch('/api/auth/telegram/start', { method: 'POST' });
    const data = await res.json();
    if (res.ok) setTelegramLink(data.deepLink);
    else setNotice(data.error ?? 'Could not start Telegram linking.');
  }

  if (me) {
    return (
      <div className="grid gap-4 rounded-3xl border border-line bg-surface-2/80 p-6">
        <p className="text-sm text-text-2">
          Signed in as <span className="font-bold text-white">{me.username}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={sendOtp} className="min-h-[40px] rounded-full border border-line px-3 text-sm font-semibold">
            Verify email
          </button>
          <button type="button" onClick={startTelegramLink} className="min-h-[40px] rounded-full border border-line px-3 text-sm font-semibold">
            Link Telegram
          </button>
          <button type="button" onClick={logout} className="min-h-[40px] rounded-full border border-line px-3 text-sm font-semibold text-red-300">
            Sign out
          </button>
        </div>
        {otpSent && (
          <div className="flex gap-2">
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              maxLength={6}
              placeholder="6-digit code"
              className="min-h-[40px] w-32 rounded-xl border border-line bg-bg/60 px-3 font-mono"
            />
            <button type="button" onClick={verifyOtp} className="glow-btn min-h-[40px] rounded-lg px-4 text-sm font-bold">
              Verify
            </button>
          </div>
        )}
        {telegramLink && (
          <a href={telegramLink} target="_blank" rel="noreferrer" className="text-brand-cyan underline">
            Open Telegram to finish linking your account →
          </a>
        )}
        {notice && <p className="text-sm text-text-3">{notice}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 rounded-3xl border border-line bg-surface-2/80 p-6">
      <div className="flex gap-2">
        <TabButton active={mode === 'login'} onClick={() => setMode('login')} label="Sign in" />
        <TabButton active={mode === 'register'} onClick={() => setMode('register')} label="Create account" />
      </div>
      <form onSubmit={submit} className="grid gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="min-h-[44px] rounded-xl border border-line bg-bg/60 px-3"
        />
        {mode === 'register' && (
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email (optional, for OTP)"
            className="min-h-[44px] rounded-xl border border-line bg-bg/60 px-3"
          />
        )}
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          minLength={8}
          required
          className="min-h-[44px] rounded-xl border border-line bg-bg/60 px-3"
        />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="glow-btn min-h-[44px] rounded-lg px-5 font-bold disabled:opacity-40">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] flex-1 rounded-full border text-sm font-semibold transition ${
        active ? 'border-text bg-white/10 text-text' : 'border-line text-text-2'
      }`}
    >
      {label}
    </button>
  );
}
