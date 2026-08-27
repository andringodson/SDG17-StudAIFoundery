import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getSession, verifyPassword, hashPassword } from '@/lib/auth';
import { checkPassword } from '@/lib/passwordStrength';
import { handleApiError } from '@/lib/apiError';

const Body = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(200) });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const strength = checkPassword(parsed.data.newPassword);
    if (!strength.valid) return NextResponse.json({ error: 'weak_password', missing: strength.missing }, { status: 400 });

    const rows = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [session.userId]);
    if (!rows[0] || !(await verifyPassword(parsed.data.currentPassword, rows[0].password_hash))) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, session.userId]);
    return NextResponse.json({ message: 'Password updated.' });
  } catch (err) {
    return handleApiError(err);
  }
}
