import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';

const Body = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional(),
  password: z.string().min(8).max(200)
});

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { username, email, password } = parsed.data;

    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE username = $1 OR ($2::text IS NOT NULL AND email = $2)',
      [username, email ?? null]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username or email already in use' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const rows = await query<{ id: string; username: string }>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, username`,
      [username, email ?? null, passwordHash]
    );
    const user = rows[0]!;

    await query('INSERT INTO user_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

    await setSessionCookie({ userId: user.id, username: user.username });
    return NextResponse.json({ user: { id: user.id, username: user.username } }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
