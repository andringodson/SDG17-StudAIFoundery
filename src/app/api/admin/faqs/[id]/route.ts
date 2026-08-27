import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiRole } from '@/lib/requireRole';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/apiError';

const UpdateBody = z.object({
  keywords: z.array(z.string().min(1).max(60)).min(1).max(20).optional(),
  response: z.string().min(1).max(4000).optional(),
  actionLabel: z.string().max(80).nullable().optional(),
  actionHref: z.string().max(255).nullable().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole('admin', 'compliance_admin');
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const parsed = UpdateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 });
    const d = parsed.data;

    const rows = await query(
      `UPDATE assistant_faqs SET
         keywords = COALESCE($1, keywords),
         response = COALESCE($2, response),
         action_label = CASE WHEN $3::boolean THEN $4 ELSE action_label END,
         action_href = CASE WHEN $5::boolean THEN $6 ELSE action_href END,
         is_active = COALESCE($7, is_active),
         updated_at = now()
       WHERE id = $8
       RETURNING id, keywords, response, action_label, action_href, is_active, created_at, updated_at`,
      [
        d.keywords ?? null, d.response ?? null,
        d.actionLabel !== undefined, d.actionLabel ?? null,
        d.actionHref !== undefined, d.actionHref ?? null,
        d.isActive ?? null, id
      ]
    );
    if (!rows[0]) return NextResponse.json({ error: 'FAQ not found.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole('admin', 'compliance_admin');
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    await query('DELETE FROM assistant_faqs WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
