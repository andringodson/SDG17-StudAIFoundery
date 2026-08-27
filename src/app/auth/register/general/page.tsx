'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { checkPassword } from '@/lib/passwordStrength';
import { authErrorMessage } from '@/lib/authErrors';

export default function GeneralRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreeTos, setAgreeTos] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim()) return setError('Please fill in every field.');
    const strength = checkPassword(password);
    if (!strength.valid) return setError(`Please create a stronger password — needs ${strength.missing.join(', ')}.`);
    if (password !== confirm) return setError('Passwords do not match.');
    if (!agreeTos || !agreePrivacy) return setError('Please accept both agreements to continue.');

    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'general_user', fullName, username: (email.split('@')[0] ?? 'user') + Math.floor(Math.random() * 1000),
          email, password
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(authErrorMessage(data.code ?? data.error) + (data.missing ? ` (needs ${data.missing.join(', ')})` : ''));
        return;
      }
      router.push('/auth/verify-email');
    } catch {
      setError(authErrorMessage('network_error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="General User" title="Create your account">
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-text-2">Full name</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} required />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-text-2">Email address</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} showStrength />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} />
        <label className="flex items-start gap-2.5 text-sm text-text-2">
          <input type="checkbox" checked={agreeTos} onChange={(e) => setAgreeTos(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>I agree to the Terms of Service</span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-text-2">
          <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>I agree to the Privacy Policy</span>
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="glow-btn min-h-[44px] rounded-lg font-semibold disabled:opacity-40">
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-text-3">
        Already have an account? <Link href="/auth/login" className="font-semibold text-text underline">Log in</Link>
      </p>
    </AuthShell>
  );
}

const inputCls = 'w-full min-h-[44px] rounded-lg border border-line bg-surface-2 px-3 text-base';
