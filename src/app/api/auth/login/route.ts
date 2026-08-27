import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
}

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    const { username, password } = parsed.data;

    const rows = await query<UserRow>(
      'SELECT id, username, password_hash FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    await setSessionCookie({ userId: user.id, username: user.username });
    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    return handleApiError(err);
  }
}
