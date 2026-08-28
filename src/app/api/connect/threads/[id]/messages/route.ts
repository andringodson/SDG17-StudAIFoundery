import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { requireApiRole } from '@/lib/requireRole';
import { handleApiError } from '@/lib/apiError';

interface ConnectionRow { id: string; user_a: string; user_b: string }

async function loadConnection(id: string, userId: string): Promise<ConnectionRow | null> {
  const rows = await query<ConnectionRow>('SELECT id, user_a, user_b FROM connections WHERE id = $1', [id]);
  const row = rows[0];
  if (!row || (row.user_a !== userId && row.user_b !== userId)) return null;
  return row;
}

/** Polled every few seconds by the client (see ConnectHub) rather than
 * pushed over a socket — this deployment has no always-on server to hold a
 * WebSocket open, so short-interval polling is the honest "real-time" here.
 * Also marks the thread read for the requesting side. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole('company', 'investor', 'government', 'general_user');
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const conn = await loadConnection(id, session.userId);
    if (!conn) return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });

    const rows = await query<{ id: string; sender_id: string; body: string; created_at: string }>(
      'SELECT id, sender_id, body, created_at FROM connection_messages WHERE connection_id = $1 ORDER BY created_at ASC LIMIT 500',
      [id]
    );

    const readCol = conn.user_a === session.userId ? 'last_read_at_a' : 'last_read_at_b';
    await query(`UPDATE connections SET ${readCol} = now() WHERE id = $1`, [id]);

    return NextResponse.json({
      messages: rows.map((r) => ({ id: r.id, mine: r.sender_id === session.userId, body: r.body, createdAt: r.created_at }))
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const Body = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole('company', 'investor', 'government', 'general_user');
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const conn = await loadConnection(id, session.userId);
    if (!conn) return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });

    const rows = await query<{ id: string; created_at: string }>(
      'INSERT INTO connection_messages (connection_id, sender_id, body) VALUES ($1, $2, $3) RETURNING id, created_at',
      [id, session.userId, parsed.data.body]
    );
    const readCol = conn.user_a === session.userId ? 'last_read_at_a' : 'last_read_at_b';
    await query(`UPDATE connections SET ${readCol} = now() WHERE id = $1`, [id]);

    return NextResponse.json({ id: rows[0]!.id, createdAt: rows[0]!.created_at }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
