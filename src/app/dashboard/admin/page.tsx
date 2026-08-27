import { requireRole } from '@/lib/requireRole';
import { query } from '@/lib/db';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { AdminSupportPanel } from '@/components/admin/AdminSupportPanel';
import { AdminFaqPanel } from '@/components/admin/AdminFaqPanel';

export default async function AdminDashboardPage() {
  const session = await requireRole('admin', 'compliance_admin');

  const userRows = await query<{ username: string; is_email_verified: boolean; profile_completed_pct: number }>(
    'SELECT username, is_email_verified, profile_completed_pct FROM users WHERE id = $1', [session.userId]
  );
  const user = userRows[0]!;

  return (
    <DashboardShell role={session.role} username={user.username} emailVerified={user.is_email_verified} profileCompletePct={user.profile_completed_pct}>
      <h1 className="text-2xl font-semibold">Admin Console</h1>
      <p className="mt-1 text-sm text-text-2">
        Support ticket review and assistant knowledge management. There is no self-service way to grant this role —
        an existing admin or the database owner sets <code className="rounded bg-surface-1 px-1">role = &apos;admin&apos;</code> directly,
        which is deliberate: privilege escalation should never be a UI button.
      </p>

      <AdminSupportPanel />
      <AdminFaqPanel />
    </DashboardShell>
  );
}
