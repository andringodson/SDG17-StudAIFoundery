import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { verifyPassword, setSessionCookie, type UserRole } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';
import { rateLimit } from '@/lib/rateLimit';

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  session_version: number;
  is_email_verified: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    const { username, password } = parsed.data;

    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    const limit = rateLimit(`login:${ip}:${username.toLowerCase()}`, 8, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'too_many_attempts', retryAfterSeconds: limit.retryAfterSeconds },
        { status: 429 }
      );
    }

    const rows = await query<UserRow>(
      'SELECT id, username, password_hash, role, session_version, is_email_verified FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionVersion: user.session_version
    });
    return NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role, emailVerified: user.is_email_verified },
      requiresEmailVerification: !user.is_email_verified
    });
  } catch (err) {
    return handleApiError(err);
  }
}
