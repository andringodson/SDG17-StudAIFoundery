import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { isInternalRequestAuthorized } from '@/lib/internal';
import { handleApiError } from '@/lib/apiError';

/**
 * Called by the bot process (server/) — never by the browser — once a user
 * has tapped the deep link and shared their phone number via Telegram's
 * native contact request. Protected by a shared secret rather than the
 * cookie session, since the caller is a server, not the signed-in browser.
 */
const Body = z.object({
  token: z.string().min(10),
  telegramId: z.number(),
  phoneNumber: z.string().min(5)
});

export async function POST(req: NextRequest) {
  try {
    if (!isInternalRequestAuthorized(req.headers.get('x-internal-secret'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const { token, telegramId, phoneNumber } = parsed.data;

    const rows = await query<{ user_id: string; expires_at: string; consumed_at: string | null }>(
      'SELECT user_id, expires_at, consumed_at FROM telegram_link_tokens WHERE token = $1',
      [token]
    );
    const link = rows[0];
    if (!link) return NextResponse.json({ error: 'Unknown or expired token' }, { status: 404 });
    if (link.consumed_at) return NextResponse.json({ error: 'Token already used' }, { status: 409 });
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 });
    }

    await query(
      'UPDATE users SET telegram_id = $1, phone_number = $2, is_phone_verified = TRUE WHERE id = $3',
      [telegramId, phoneNumber, link.user_id]
    );
    await query('UPDATE telegram_link_tokens SET consumed_at = NOW() WHERE token = $1', [token]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
