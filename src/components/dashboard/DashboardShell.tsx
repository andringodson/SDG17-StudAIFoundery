'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

const ROLE_LABEL: Record<string, string> = {
  company: 'Company Account',
  investor: 'Investor Account',
  general_user: 'Explorer Account',
  admin: 'Administrator',
  compliance_admin: 'Compliance Administrator'
};

export function DashboardShell({
  role,
  username,
  emailVerified,
  profileCompletePct,
  children
}: {
  role: string;
  username: string;
  emailVerified: boolean;
  profileCompletePct: number;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <div className="mx-auto w-[min(100%-2.5rem,72rem)] pb-24 pt-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link href="/"><Logo /></Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold"
          >
            👤 {username}
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface-1 p-2 shadow-2xl">
              <div className="border-b border-line px-3 py-2">
                <p className="font-semibold">{username}</p>
                <p className="text-xs text-text-3">{ROLE_LABEL[role] ?? role}</p>
                <p className="mt-1 text-xs text-status-complete">{emailVerified ? '✓ Email Verified' : '○ Email not verified'}</p>
                <p className="text-xs text-text-3">Profile {profileCompletePct}% Complete</p>
              </div>
              <MenuItem href="/dashboard">My Profile</MenuItem>
              <MenuItem href="/dashboard">Dashboard</MenuItem>
              <MenuItem disabled>Messages (coming soon)</MenuItem>
              <MenuItem disabled>Notifications (coming soon)</MenuItem>
              <MenuItem href="/dashboard/settings">Account Settings</MenuItem>
              <MenuItem href="/dashboard/settings">Security</MenuItem>
              <MenuItem href="mailto:support@example.com">Help &amp; Support</MenuItem>
              <div className="my-1 border-t border-line" />
              <button role="menuitem" onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-300 hover:bg-white/5">
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {children}
    </div>
  );
}

function MenuItem({ href, disabled, children }: { href?: string; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm text-text-3 opacity-50">{children}</span>;
  }
  return (
    <Link role="menuitem" href={href!} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">
      {children}
    </Link>
  );
}
