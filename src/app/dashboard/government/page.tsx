import { query } from '@/lib/db';
import { requireRole } from '@/lib/requireRole';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { formatCount } from '@/lib/inr';

export default async function GovernmentDashboardPage() {
  const session = await requireRole('government');

  const [userRows, progressRows, agencyRows] = await Promise.all([
    query<{ username: string; is_email_verified: boolean; profile_completed_pct: number }>(
      'SELECT username, is_email_verified, profile_completed_pct FROM users WHERE id = $1', [session.userId]
    ),
    query<{ gamification_points: number }>('SELECT gamification_points FROM user_progress WHERE user_id = $1', [session.userId]),
    query<{ agency_name: string; jurisdiction_level: string; focus_area: string; country: string }>(
      'SELECT agency_name, jurisdiction_level, focus_area, country FROM government_profiles WHERE user_id = $1', [session.userId]
    )
  ]);
  const user = userRows[0]!;
  const points = progressRows[0]?.gamification_points ?? 0;
  const agency = agencyRows[0];

  return (
    <DashboardShell role="government" username={user.username} emailVerified={user.is_email_verified} profileCompletePct={user.profile_completed_pct}>
      <h1 className="text-2xl font-semibold">Government Dashboard</h1>
      <p className="mt-1 text-text-2">{agency?.agency_name} — {agency?.jurisdiction_level}, {agency?.focus_area}, {agency?.country}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Profile completion" value={`${user.profile_completed_pct}%`} />
        <Stat label="Platform points" value={formatCount(points)} />
        <Stat label="Email verified" value={user.is_email_verified ? 'Yes' : 'No'} />
      </div>

      <div className="mt-8 rounded-xl border border-line bg-surface-1/60 p-5">
        <h2 className="font-semibold">Real-time partner connect</h2>
        <p className="mt-1 text-sm text-text-2">
          Browse registered businesses and investors by sector, and message them directly — the platform's answer
          to how slowly multi-stakeholder coordination usually moves (SDG target 17.16/17.17). Every account is
          self-registered, same as yours; nothing here is simulated.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/connect" className="glow-btn inline-flex min-h-[40px] items-center rounded-lg px-4 text-sm font-semibold">Open Connect</a>
          <a href="/#map" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Partnership Map</a>
          <a href="/#builder" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Partnership Builder</a>
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-text-3">{label}</p>
    </div>
  );
}
