import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';
import type { PartnershipRecord } from '../route';

const UpdateBody = z.object({
  status: z.enum(['proposed', 'active', 'completed']).optional(),
  note: z.string().max(300).nullable().optional()
});

/** Patches one element inside the JSONB array in a single UPDATE — the
 * jsonb_agg/CASE rewrites every element, replacing only the one whose id
 * matches, so this can't race with a concurrent append from POST /. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const { id } = await params;
    const parsed = UpdateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 });
    if (parsed.data.status === undefined && parsed.data.note === undefined) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const patch = { ...parsed.data, updatedAt: new Date().toISOString() };

    const rows = await query<{ active_partnerships: PartnershipRecord[] }>(
      `UPDATE user_progress
       SET active_partnerships = (
         SELECT COALESCE(jsonb_agg(
           CASE WHEN elem->>'id' = $2 THEN elem || $3::jsonb ELSE elem END
         ), '[]'::jsonb)
         FROM jsonb_array_elements(COALESCE(active_partnerships, '[]'::jsonb)) elem
       ),
       updated_at = NOW()
       WHERE user_id = $1
       RETURNING active_partnerships`,
      [session.userId, id, JSON.stringify(patch)]
    );
    const partnership = rows[0]?.active_partnerships.find((p) => p.id === id);
    if (!partnership) return NextResponse.json({ error: 'Partnership not found.' }, { status: 404 });

    return NextResponse.json({ partnership });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const { id } = await params;
    await query(
      `UPDATE user_progress
       SET active_partnerships = (
         SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
         FROM jsonb_array_elements(COALESCE(active_partnerships, '[]'::jsonb)) elem
         WHERE elem->>'id' != $2
       ),
       updated_at = NOW()
       WHERE user_id = $1`,
      [session.userId, id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
