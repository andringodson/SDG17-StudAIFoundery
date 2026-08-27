import { Telegraf, Markup } from 'telegraf';

/**
 * Telegram auth flow:
 *   1. User signs in on the website and clicks "Link Telegram".
 *   2. The website (Next.js) creates a short-lived token and returns a deep
 *      link https://t.me/<bot>?start=<token>.
 *   3. Opening that link sends /start <token> to this bot.
 *   4. The bot asks the user to share their phone number via Telegram's
 *      native contact-request button (never typed — Telegram handles it).
 *   5. On receiving the contact, the bot POSTs { token, telegramId,
 *      phoneNumber } to WEB_APP_URL/api/auth/telegram/callback, authenticated
 *      with INTERNAL_SHARED_SECRET, which links the account.
 */
export function createBot({ token, webAppUrl, internalSecret }) {
  const bot = new Telegraf(token);
  const pendingTokenByChat = new Map();

  bot.start(async (ctx) => {
    const linkToken = (ctx.message.text || '').split(' ')[1];
    if (!linkToken) {
      await ctx.reply(
        'Welcome to the SDG 17 Global Partnership Platform bot.\n\n' +
        'To link your account, tap "Link Telegram" on the website first — it gives you a one-time link that opens this chat with a code attached.'
      );
      return;
    }

    pendingTokenByChat.set(ctx.chat.id, linkToken);
    await ctx.reply(
      'To finish linking your account, share your phone number using the button below. ' +
      'Telegram handles this natively — nothing is typed.',
      Markup.keyboard([Markup.button.contactRequest('📱 Share Phone Number')])
        .resize()
        .oneTime()
    );
  });

  bot.on('contact', async (ctx) => {
    const linkToken = pendingTokenByChat.get(ctx.chat.id);
    if (!linkToken) {
      await ctx.reply('No pending link request. Start from the website\'s "Link Telegram" button.');
      return;
    }
    const contact = ctx.message.contact;
    if (contact.user_id !== ctx.from.id) {
      await ctx.reply('Please share your own contact, not someone else\'s.');
      return;
    }

    try {
      const res = await fetch(`${webAppUrl}/api/auth/telegram/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
        body: JSON.stringify({
          token: linkToken,
          telegramId: ctx.from.id,
          phoneNumber: contact.phone_number
        })
      });

      if (res.ok) {
        pendingTokenByChat.delete(ctx.chat.id);
        await ctx.reply('✅ Your account is linked. You can close this chat and return to the website.', Markup.removeKeyboard());
      } else {
        const body = await res.json().catch(() => ({}));
        await ctx.reply(`Could not link your account: ${body.error ?? 'unknown error'}. The link may have expired — request a new one from the website.`);
      }
    } catch (err) {
      await ctx.reply('Could not reach the website to complete linking. Please try again shortly.');
      // eslint-disable-next-line no-console
      console.error('[bot] callback error:', err);
    }
  });

  bot.catch((err, ctx) => {
    // eslint-disable-next-line no-console
    console.error(`[bot] error for ${ctx.updateType}:`, err);
  });

  return bot;
}
