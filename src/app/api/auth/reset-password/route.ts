import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkPassword } from '@/lib/passwordStrength';
import { handleApiError } from '@/lib/apiError';

const Body = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200)
});

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const strength = checkPassword(parsed.data.password);
    if (!strength.valid) {
      return NextResponse.json({ error: 'weak_password', missing: strength.missing }, { status: 400 });
    }

    const rows = await query<{ user_id: string; expires_at: string; consumed_at: string | null }>(
      'SELECT user_id, expires_at, consumed_at FROM password_reset_tokens WHERE token = $1',
      [parsed.data.token]
    );
    const record = rows[0];
    if (!record) return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 404 });
    if (record.consumed_at) return NextResponse.json({ error: 'This reset link has already been used.' }, { status: 409 });
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This reset link has expired.' }, { status: 410 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    // Bumping session_version also signs the user out of every existing
    // session — the right behaviour after a password reset.
    await query(
      'UPDATE users SET password_hash = $1, session_version = session_version + 1 WHERE id = $2',
      [passwordHash, record.user_id]
    );
    await query('UPDATE password_reset_tokens SET consumed_at = NOW() WHERE token = $1', [parsed.data.token]);

    return NextResponse.json({ message: 'Password successfully updated.' });
  } catch (err) {
    return handleApiError(err);
  }
}
