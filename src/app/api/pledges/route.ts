import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';

export async function GET() {
  try {
    const rows = await query<{ id: string; display_name: string; role: string; pledge_text: string; created_at: string }>(
      'SELECT id, display_name, role, pledge_text, created_at FROM pledges ORDER BY created_at DESC LIMIT 100'
    );
    return NextResponse.json({
      pledges: rows.map((r) => ({ id: r.id, displayName: r.display_name, role: r.role, pledgeText: r.pledge_text, createdAt: r.created_at }))
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const Body = z.object({
  displayName: z.string().min(2).max(60),
  role: z.string().min(1).max(40),
  pledgeText: z.string().min(12).max(240)
});

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid pledge' }, { status: 400 });
    }
    const session = await getSession();
    const { displayName, role, pledgeText } = parsed.data;

    await query(
      'INSERT INTO pledges (user_id, display_name, role, pledge_text) VALUES ($1, $2, $3, $4)',
      [session?.userId ?? null, displayName, role, pledgeText]
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
