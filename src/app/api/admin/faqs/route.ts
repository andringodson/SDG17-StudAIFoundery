import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiRole } from '@/lib/requireRole';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/apiError';

const CreateBody = z.object({
  keywords: z.array(z.string().min(1).max(60)).min(1).max(20),
  response: z.string().min(1).max(4000),
  actionLabel: z.string().max(80).optional(),
  actionHref: z.string().max(255).optional()
});

/** Admin/compliance_admin only: list and create assistant knowledge entries.
 * These merge into the assistant's answers alongside the hardcoded fallback
 * in src/lib/assistant/knowledge.ts — see getCustomFaqs() there. */
export async function GET() {
  const session = await requireApiRole('admin', 'compliance_admin');
  if (session instanceof NextResponse) return session;

  try {
    const rows = await query(
      'SELECT id, keywords, response, action_label, action_href, is_active, created_at, updated_at FROM assistant_faqs ORDER BY created_at DESC'
    );
    return NextResponse.json({ faqs: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireApiRole('admin', 'compliance_admin');
  if (session instanceof NextResponse) return session;

  try {
    const parsed = CreateBody.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid FAQ entry.' }, { status: 400 });
    const d = parsed.data;
    const rows = await query(
      `INSERT INTO assistant_faqs (keywords, response, action_label, action_href, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, keywords, response, action_label, action_href, is_active, created_at, updated_at`,
      [d.keywords, d.response, d.actionLabel ?? null, d.actionHref ?? null, session.userId]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
