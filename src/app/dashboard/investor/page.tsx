import { query } from '@/lib/db';
import { requireRole } from '@/lib/requireRole';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { formatCount } from '@/lib/inr';

export default async function InvestorDashboardPage() {
  const session = await requireRole('investor');

  const [userRows, progressRows, investorRows] = await Promise.all([
    query<{ username: string; is_email_verified: boolean; profile_completed_pct: number }>(
      'SELECT username, is_email_verified, profile_completed_pct FROM users WHERE id = $1', [session.userId]
    ),
    query<{ gamification_points: number }>('SELECT gamification_points FROM user_progress WHERE user_id = $1', [session.userId]),
    query<{ investor_type: string; preferred_sector: string; preferred_stage: string }>(
      'SELECT investor_type, preferred_sector, preferred_stage FROM investor_profiles WHERE user_id = $1', [session.userId]
    )
  ]);
  const user = userRows[0]!;
  const points = progressRows[0]?.gamification_points ?? 0;
  const investor = investorRows[0];

  return (
    <DashboardShell role="investor" username={user.username} emailVerified={user.is_email_verified} profileCompletePct={user.profile_completed_pct}>
      <h1 className="text-2xl font-semibold">Investor Dashboard</h1>
      <p className="mt-1 text-text-2">{investor?.investor_type} — {investor?.preferred_sector}, {investor?.preferred_stage}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Profile completion" value={`${user.profile_completed_pct}%`} />
        <Stat label="Platform points" value={formatCount(points)} />
        <Stat label="Email verified" value={user.is_email_verified ? 'Yes' : 'No'} />
      </div>

      <div className="mt-8 rounded-xl border border-line bg-surface-1/60 p-5">
        <h2 className="font-semibold">What's real here today</h2>
        <p className="mt-1 text-sm text-text-2">
          Company matching and a live portfolio feed aren't connected to any data source yet, so this dashboard
          won't invent numbers for them. What you can use now: the Global Partnership Map (real regional data),
          the Finance Impact Simulator, and the Partnership Builder's scoring model. Ask the AI assistant to
          explain any of them.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/#map" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Partnership Map</a>
          <a href="/#finance" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-white/5">Finance Simulator</a>
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
