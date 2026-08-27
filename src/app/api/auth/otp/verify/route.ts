import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { verifyOtp } from '@/lib/otp';
import { handleApiError } from '@/lib/apiError';

const Body = z.object({ code: z.string().length(6) });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'A 6-digit code is required' }, { status: 400 });

    const rows = await query<{ otp_code: string | null; otp_expires_at: string | null }>(
      'SELECT otp_code, otp_expires_at FROM users WHERE id = $1',
      [session.userId]
    );
    const stored = rows[0] ? { code: rows[0].otp_code, expiresAt: rows[0].otp_expires_at } : null;
    const result = verifyOtp(parsed.data.code, stored);

    if (result !== 'ok') {
      return NextResponse.json({ error: result }, { status: 400 });
    }

    await query('UPDATE users SET is_email_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1', [session.userId]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
