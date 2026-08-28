import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { handleApiError } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ user: null });
    const [user] = await query<{ email: string | null; is_email_verified: boolean; session_version: number }>(
      'SELECT email, is_email_verified, session_version FROM users WHERE id = $1',
      [session.userId]
    );
    if (!user || user.session_version !== session.sessionVersion) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: { ...session, email: user.email, emailVerified: user.is_email_verified }
    });
  } catch (err) {
    return handleApiError(err);
  }
}
