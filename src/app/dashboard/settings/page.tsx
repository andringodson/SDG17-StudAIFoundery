'use client';

import { useState, type FormEvent } from 'react';
import { PasswordField } from '@/components/auth/PasswordField';
import { authErrorMessage } from '@/lib/authErrors';

export default function SettingsPage() {
  return (
    <main className="mx-auto w-[min(100%-2.5rem,40rem)] py-12">
      <h1 className="text-2xl font-semibold">Account Settings &amp; Security</h1>
      <p className="mt-1 text-sm text-text-2">
        Two-factor authentication, active-session listing, and connected accounts aren't built yet —
        those need more infrastructure than a password change does. What's here is real.
      </p>

      <ChangePassword />
      <LogoutAllDevices />
    </main>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setMessage('');
    if (newPassword !== confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) return setError(authErrorMessage(data.code ?? data.error));
      setMessage('Password updated.');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-line bg-surface-1/60 p-5">
      <h2 className="font-semibold">Change Password</h2>
      <form onSubmit={submit} className="mt-3 grid gap-3">
        <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
        <PasswordField label="New password" value={newPassword} onChange={setNewPassword} showStrength />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="text-sm text-status-complete">{message}</p>}
        <button type="submit" disabled={busy} className="glow-btn min-h-[40px] rounded-lg text-sm font-semibold disabled:opacity-40">
          {busy ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}

function LogoutAllDevices() {
  const [message, setMessage] = useState('');
  async function run() {
    const res = await fetch('/api/auth/logout-all', { method: 'POST' });
    if (res.ok) {
      setMessage('Signed out of all devices. Redirecting…');
      setTimeout(() => { window.location.href = '/auth/login'; }, 1200);
    }
  }
  return (
    <section className="mt-6 rounded-xl border border-line bg-surface-1/60 p-5">
      <h2 className="font-semibold">Active Sessions</h2>
      <p className="mt-1 text-sm text-text-2">
        This platform doesn't track individual device sessions yet, but you can invalidate every signed-in
        session at once — including this one.
      </p>
      {message && <p role="status" className="mt-2 text-sm text-status-complete">{message}</p>}
      <button onClick={run} className="mt-3 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-red-300 hover:bg-white/5">
        Log Out From Other Devices
      </button>
    </section>
  );
}
