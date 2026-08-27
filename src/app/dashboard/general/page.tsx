import { query } from '@/lib/db';
import { requireRole } from '@/lib/requireRole';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { formatCount } from '@/lib/inr';

export default async function GeneralDashboardPage() {
  const session = await requireRole('general_user');

  const [userRows, progressRows] = await Promise.all([
    query<{ username: string; is_email_verified: boolean; profile_completed_pct: number }>(
      'SELECT username, is_email_verified, profile_completed_pct FROM users WHERE id = $1', [session.userId]
    ),
    query<{ gamification_points: number; earned_badges: string[] }>(
      'SELECT gamification_points, earned_badges FROM user_progress WHERE user_id = $1', [session.userId]
    )
  ]);
  const user = userRows[0]!;
  const points = progressRows[0]?.gamification_points ?? 0;
  const badges = progressRows[0]?.earned_badges?.length ?? 0;

  return (
    <DashboardShell role="general_user" username={user.username} emailVerified={user.is_email_verified} profileCompletePct={user.profile_completed_pct}>
      <h1 className="text-2xl font-semibold">Welcome, {user.username}</h1>
      <p className="mt-1 text-text-2">Explore SDG 17 projects, tools, and educational content.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Points" value={formatCount(points)} />
        <Stat label="Badges" value={formatCount(badges)} />
        <Stat label="Profile completion" value={`${user.profile_completed_pct}%`} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <a href="/#map" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Partnership Map</a>
        <a href="/#finance" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Finance Simulator</a>
        <a href="/#capacity" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Capacity Building</a>
        <a href="/#builder" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Partnership Builder</a>
        <a href="/#action" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Action Centre</a>
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
