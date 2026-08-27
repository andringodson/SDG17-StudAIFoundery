/**
 * Shared-secret check for server-to-server calls from the bot/WS process
 * (server/) into this app's API routes (e.g. the Telegram callback that
 * links a verified phone number to a user). Not a substitute for real auth
 * on user-facing routes — only for the one internal hop.
 */
export function isInternalRequestAuthorized(headerValue: string | null): boolean {
  const expected = process.env.INTERNAL_SHARED_SECRET;
  if (!expected) return false;
  if (!headerValue) return false;
  return timingSafeEqual(headerValue, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
