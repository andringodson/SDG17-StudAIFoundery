import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generateLinkToken } from '@/lib/otp';
import { handleApiError } from '@/lib/apiError';

const TOKEN_TTL_MS = 10 * 60 * 1000;

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_USERNAME is not set — create a bot with @BotFather first. See README.md.' },
        { status: 503 }
      );
    }

    const token = generateLinkToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await query('INSERT INTO telegram_link_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [
      token,
      session.userId,
      expiresAt
    ]);

    return NextResponse.json({ deepLink: `https://t.me/${botUsername}?start=${token}`, expiresAt });
  } catch (err) {
    return handleApiError(err);
  }
}
