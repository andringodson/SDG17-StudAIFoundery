import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/requireRole';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/apiError';

/** Admin/compliance_admin only: list support tickets with optional status
 * filter, newest first. Backs the ticket table on /dashboard/admin. */
export async function GET(req: NextRequest) {
  const session = await requireApiRole('admin', 'compliance_admin');
  if (session instanceof NextResponse) return session;

  try {
    const status = new URL(req.url).searchParams.get('status');
    const rows = status && status !== 'all'
      ? await query(
          `SELECT id, reference, category, description, current_page, contact_email, contact_consent, status, created_at, updated_at
           FROM support_tickets WHERE status = $1 ORDER BY created_at DESC LIMIT 200`,
          [status]
        )
      : await query(
          `SELECT id, reference, category, description, current_page, contact_email, contact_consent, status, created_at, updated_at
           FROM support_tickets ORDER BY created_at DESC LIMIT 200`
        );

    const counts = await query<{ status: string; count: string }>(
      'SELECT status, COUNT(*)::text AS count FROM support_tickets GROUP BY status'
    );
    const byStatus: Record<string, number> = { received: 0, in_review: 0, resolved: 0, closed: 0 };
    for (const row of counts) byStatus[row.status] = Number(row.count);

    return NextResponse.json({ tickets: rows, counts: byStatus, total: Object.values(byStatus).reduce((a, b) => a + b, 0) });
  } catch (err) {
    return handleApiError(err);
  }
}
