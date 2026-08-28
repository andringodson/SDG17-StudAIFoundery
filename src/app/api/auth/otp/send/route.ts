import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generateOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/mailer';
import { handleApiError } from '@/lib/apiError';
import { rateLimit } from '@/lib/rateLimit';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const limit = rateLimit(`otp:${session.userId}`, 1, 45_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Please wait before requesting another code.', retryAfterSeconds: limit.retryAfterSeconds }, { status: 429 });
    }

    const rows = await query<{ email: string | null }>('SELECT email FROM users WHERE id = $1', [session.userId]);
    const email = rows[0]?.email;
    if (!email) return NextResponse.json({ error: 'No email on file for this account' }, { status: 400 });

    const { code, expiresAt } = generateOtp();
    await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [code, expiresAt, session.userId]);
    const { delivered } = await sendOtpEmail(email, code);

    return NextResponse.json({ ok: true, delivered });
  } catch (err) {
    return handleApiError(err);
  }
}
