import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession, clearSessionCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';

/** Signs out of every device: bumps session_version so every previously
 * issued JWT — including this browser's — stops being treated as current. */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    await query('UPDATE users SET session_version = session_version + 1 WHERE id = $1', [session.userId]);
    await clearSessionCookie();
    return NextResponse.json({ message: 'Signed out of all devices.' });
  } catch (err) {
    return handleApiError(err);
  }
}
