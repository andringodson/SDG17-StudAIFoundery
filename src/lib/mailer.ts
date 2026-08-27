import { Resend } from 'resend';

/**
 * Sends the OTP email if RESEND_API_KEY is configured. In its absence (local
 * dev, or before the account is created) it logs the code to the server
 * console instead of throwing — the auth flow must stay testable without a
 * Resend account.
 */
export async function sendOtpEmail(to: string, code: string): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SDG 17 Hub <onboarding@resend.dev>';

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log(`[mailer:dev-fallback] OTP for ${to} is ${code} (RESEND_API_KEY not set)`);
    return { delivered: false };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: 'Your SDG 17 Hub verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
  });
  return { delivered: true };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SDG 17 Hub <onboarding@resend.dev>';

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log(`[mailer:dev-fallback] Password reset link for ${to}: ${resetUrl}`);
    return { delivered: false };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: 'Reset your SDG 17 Hub password',
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
    html: `<p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`
  });
  return { delivered: true };
}

export async function sendSupportConfirmation(to: string, reference: string, status: string): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SDG 17 Hub <onboarding@resend.dev>';
  const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/support`;

  if (!apiKey) {
    // Keep an audit-friendly server signal without exposing the report text.
    console.log(`[mailer:dev-fallback] Support confirmation for ${reference} to ${to} (RESEND_API_KEY not set)`);
    return { delivered: false };
  }

  try {
    await new Resend(apiKey).emails.send({
      from,
      to,
      subject: `Support request received — ${reference}`,
      text: `We received your SDG 17 platform support request. Reference: ${reference}. Current status: ${status}. Check its status at ${statusUrl}.`,
      html: `<p>We received your SDG 17 platform support request.</p><p><strong>Reference:</strong> ${reference}<br/><strong>Current status:</strong> ${status}</p><p><a href="${statusUrl}">Check request status</a></p>`
    });
    return { delivered: true };
  } catch (error) {
    console.error('[mailer] support confirmation failed', error);
    return { delivered: false };
  }
}
