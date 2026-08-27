import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';

const PILLAR_IDS = ['finance', 'technology', 'capacity', 'trade', 'systemic'] as const;

export async function GET() {
  try {
    const rows = await query<{ pillar_id: string; count: string }>(
      'SELECT pillar_id, COUNT(*)::text AS count FROM audience_votes GROUP BY pillar_id'
    );
    const tally: Record<string, number> = Object.fromEntries(PILLAR_IDS.map((id) => [id, 0]));
    for (const row of rows) tally[row.pillar_id] = Number(row.count);
    return NextResponse.json({ tally });
  } catch (err) {
    return handleApiError(err);
  }
}

const Body = z.object({ pillarId: z.enum(PILLAR_IDS) });

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 });

    const session = await getSession();

    if (session) {
      // One live vote per signed-in user — re-voting swaps their pick.
      await query('DELETE FROM audience_votes WHERE user_id = $1', [session.userId]);
      await query('INSERT INTO audience_votes (pillar_id, user_id) VALUES ($1, $2)', [parsed.data.pillarId, session.userId]);
    } else {
      // Anonymous votes are allowed (no login wall on the poll) but cannot be de-duplicated.
      await query('INSERT INTO audience_votes (pillar_id, user_id) VALUES ($1, NULL)', [parsed.data.pillarId]);
    }

    // Best-effort push to the real-time server so connected clients update
    // immediately; the REST GET above remains the source of truth either way.
    const wsInternalUrl = process.env.WS_SERVER_INTERNAL_URL;
    const secret = process.env.INTERNAL_SHARED_SECRET;
    if (wsInternalUrl && secret) {
      fetch(`${wsInternalUrl}/internal/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
        body: JSON.stringify({ type: 'vote', pillarId: parsed.data.pillarId })
      }).catch(() => { /* real-time server may not be deployed yet — non-fatal */ });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
