import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { generateLinkToken } from '@/lib/otp';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { handleApiError } from '@/lib/apiError';
import { rateLimit } from '@/lib/rateLimit';

const Body = z.object({ email: z.string().email() });
const TOKEN_TTL_MS = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    const limit = rateLimit(`forgot:${ip}:${parsed.data.email.toLowerCase()}`, 4, 15 * 60 * 1000);
    // Deliberately still return the generic success message below even when
    // rate-limited — an attacker must not be able to tell email existence or
    // attempt-count apart from the response.
    if (limit.allowed) {
      const rows = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [parsed.data.email]);
      const user = rows[0];
      if (user) {
        const token = generateLinkToken();
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
        await query('INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [
          token, user.id, expiresAt
        ]);
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/reset-password?token=${token}`;
        await sendPasswordResetEmail(parsed.data.email, resetUrl);
      }
    }

    return NextResponse.json({
      message: 'If an account exists for this email address, a password reset link will be sent.'
    });
  } catch (err) {
    return handleApiError(err);
  }
}
