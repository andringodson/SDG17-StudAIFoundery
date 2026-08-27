import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiRole } from '@/lib/requireRole';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/apiError';

const Body = z.object({ status: z.enum(['received', 'in_review', 'resolved', 'closed']) });

/** Admin/compliance_admin only: update a single ticket's status. This is the
 * entire "administrator workflow" for support — no assignment, no comment
 * thread, no email-on-update yet; those aren't built. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole('admin', 'compliance_admin');
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

    const rows = await query<{ reference: string; status: string; updated_at: string }>(
      'UPDATE support_tickets SET status = $1, updated_at = now() WHERE id = $2 RETURNING reference, status, updated_at',
      [parsed.data.status, id]
    );
    if (!rows[0]) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return handleApiError(err);
  }
}
