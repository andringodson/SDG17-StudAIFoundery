import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';

/**
 * "My Partnerships" — turns db/schema.sql's user_progress.active_partnerships
 * (present since the original schema, written to by nothing) into a real
 * accountability trail: partnerships born from the Partnership Builder or
 * from a Connect thread get saved here, with a status a person updates by
 * hand as the partnership actually progresses. This is what SDG 17.16-17.19
 * calls for and this platform didn't have — discovery and modelling
 * existed, tracking didn't.
 *
 * Every write below is a single atomic UPDATE over the JSONB array (append,
 * or jsonb_agg-with-CASE to patch/remove one element) rather than a
 * read-modify-write from the client — two tabs saving at once can't clobber
 * each other's entry.
 */

export interface PartnershipRecord {
  id: string;
  source: 'builder' | 'connect';
  title: string;
  detail: string;
  partnerUserId: string | null;
  status: 'proposed' | 'active' | 'completed';
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const rows = await query<{ active_partnerships: PartnershipRecord[] }>(
      'SELECT active_partnerships FROM user_progress WHERE user_id = $1',
      [session.userId]
    );
    const partnerships = rows[0]?.active_partnerships ?? [];
    // Newest first — that's the order a person cares about on a dashboard.
    partnerships.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return NextResponse.json({ partnerships });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateBody = z.object({
  source: z.enum(['builder', 'connect']),
  title: z.string().min(1).max(160),
  detail: z.string().max(300),
  partnerUserId: z.string().uuid().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const parsed = CreateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid partnership.' }, { status: 400 });
    const d = parsed.data;

    const now = new Date().toISOString();
    const record: PartnershipRecord = {
      id: crypto.randomUUID(),
      source: d.source,
      title: d.title,
      detail: d.detail,
      partnerUserId: d.partnerUserId ?? null,
      status: 'proposed',
      note: null,
      createdAt: now,
      updatedAt: now
    };

    // Ensures a user_progress row exists (registration already creates one,
    // but this makes the endpoint self-sufficient regardless) then appends.
    await query(
      `INSERT INTO user_progress (user_id, active_partnerships)
       VALUES ($1, jsonb_build_array($2::jsonb))
       ON CONFLICT (user_id) DO UPDATE SET
         active_partnerships = COALESCE(user_progress.active_partnerships, '[]'::jsonb) || jsonb_build_array($2::jsonb),
         updated_at = NOW()`,
      [session.userId, JSON.stringify(record)]
    );

    return NextResponse.json({ partnership: record }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
