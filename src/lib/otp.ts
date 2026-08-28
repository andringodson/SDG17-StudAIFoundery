/**
 * Pure OTP generation/verification logic — no DB or network calls, so it is
 * unit-testable on its own (see test/otp.test.mjs). Callers persist the
 * returned code + expiry to users.otp_code / users.otp_expires_at.
 */

export const OTP_LENGTH = 6;
// Allow time for email delivery and checking spam folders.
export const OTP_TTL_MS = 30 * 60 * 1000;

export interface GeneratedOtp {
  code: string;
  expiresAt: Date;
}

export function generateOtp(now: Date = new Date()): GeneratedOtp {
  const max = 10 ** OTP_LENGTH;
  const code = String(Math.floor(Math.random() * max)).padStart(OTP_LENGTH, '0');
  return { code, expiresAt: new Date(now.getTime() + OTP_TTL_MS) };
}

export type OtpVerifyResult = 'ok' | 'expired' | 'mismatch' | 'missing';

export function verifyOtp(
  submitted: string,
  stored: { code: string | null; expiresAt: Date | string | null } | null,
  now: Date = new Date()
): OtpVerifyResult {
  if (!stored || !stored.code || !stored.expiresAt) return 'missing';
  const expires = new Date(stored.expiresAt);
  if (now.getTime() > expires.getTime()) return 'expired';
  if (submitted.trim() !== stored.code) return 'mismatch';
  return 'ok';
}

/** A short-lived opaque token used for the /start deep-link into the Telegram bot. */
export function generateLinkToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
