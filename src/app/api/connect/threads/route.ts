import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { requireApiRole } from '@/lib/requireRole';
import { handleApiError } from '@/lib/apiError';

interface ThreadRow {
  id: string;
  other_user_id: string;
  other_username: string;
  other_org_name: string | null;
  other_role: string;
  last_body: string | null;
  last_sender_id: string | null;
  last_at: string | null;
  unread: boolean;
}

/** One row per thread the signed-in user is part of, newest activity first,
 * with the other party's display name resolved from whichever profile table
 * matches their role (falling back to username for general_user accounts,
 * which have no organisation profile). */
export async function GET() {
  const session = await requireApiRole('company', 'investor', 'government', 'general_user');
  if (session instanceof NextResponse) return session;

  try {
    const rows = await query<ThreadRow>(
      `SELECT
         c.id,
         other.id AS other_user_id,
         other.username AS other_username,
         COALESCE(cp.company_name, ip.organisation_name, gp.agency_name) AS other_org_name,
         other.role AS other_role,
         lm.body AS last_body,
         lm.sender_id AS last_sender_id,
         lm.created_at AS last_at,
         (lm.created_at IS NOT NULL AND lm.created_at > COALESCE(
            CASE WHEN c.user_a = $1 THEN c.last_read_at_a ELSE c.last_read_at_b END,
            '-infinity'::timestamptz
         ) AND lm.sender_id != $1) AS unread
       FROM connections c
       JOIN users other ON other.id = (CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END)
       LEFT JOIN company_profiles cp ON cp.user_id = other.id
       LEFT JOIN investor_profiles ip ON ip.user_id = other.id
       LEFT JOIN government_profiles gp ON gp.user_id = other.id
       LEFT JOIN LATERAL (
         SELECT body, sender_id, created_at FROM connection_messages
         WHERE connection_id = c.id ORDER BY created_at DESC LIMIT 1
       ) lm ON true
       WHERE c.user_a = $1 OR c.user_b = $1
       ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
      [session.userId]
    );

    return NextResponse.json({
      threads: rows.map((r) => ({
        id: r.id,
        otherUserId: r.other_user_id,
        otherName: r.other_org_name || r.other_username,
        otherRole: r.other_role,
        lastMessage: r.last_body,
        lastAt: r.last_at,
        mine: r.last_sender_id === session.userId,
        unread: r.unread
      }))
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const Body = z.object({ recipientUserId: z.string().uuid() });

/** Find-or-create the (unordered) thread between the signed-in user and
 * recipientUserId. Returns the connection id either way — idempotent, so
 * the client can always call this before opening a thread. */
export async function POST(req: NextRequest) {
  const session = await requireApiRole('company', 'investor', 'government', 'general_user');
  if (session instanceof NextResponse) return session;

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    const { recipientUserId } = parsed.data;
    if (recipientUserId === session.userId) {
      return NextResponse.json({ error: 'You cannot start a thread with yourself.' }, { status: 400 });
    }

    const recipient = await query<{ id: string }>('SELECT id FROM users WHERE id = $1', [recipientUserId]);
    if (!recipient[0]) return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });

    const [userA, userB] = [session.userId, recipientUserId].sort();
    const rows = await query<{ id: string }>(
      `INSERT INTO connections (user_a, user_b) VALUES ($1, $2)
       ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
       RETURNING id`,
      [userA, userB]
    );
    return NextResponse.json({ threadId: rows[0]!.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
