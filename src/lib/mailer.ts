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
      subject: `Your request has been submitted — ${reference}`,
      text: `Your report has been submitted and logged with the SDG 17 Hub support team for review. Reference: ${reference}. Current status: ${status}. It will be reviewed and acted on by the responsible team; check its status any time at ${statusUrl}.`,
      html: `<p>Your report has been submitted and logged with the SDG 17 Hub support team for review.</p><p><strong>Reference:</strong> ${reference}<br/><strong>Current status:</strong> ${status}</p><p>It will be reviewed and acted on by the responsible team.</p><p><a href="${statusUrl}">Check request status</a></p>`
    });
    return { delivered: true };
  } catch (error) {
    console.error('[mailer] support confirmation failed', error);
    return { delivered: false };
  }
}

/**
 * SMS confirmation via Twilio's REST API (plain fetch — no SDK dependency,
 * same pattern as src/lib/oauth.ts). Inert until TWILIO_ACCOUNT_SID /
 * TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are all set — creating that account
 * is a human, identity/payment-verified step no automation can complete.
 * Until then this logs to the console and reports undelivered, exactly like
 * every other unconfigured channel in this app.
 */
export async function sendSupportSmsConfirmation(to: string, reference: string): Promise<{ delivered: boolean }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[mailer:dev-fallback] SMS confirmation for ${reference} to ${to} (Twilio not configured)`);
    return { delivered: false };
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: `SDG 17 Hub: your report ${reference} was received and will be reviewed by the responsible team. Track it at ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/support`
      })
    });
    if (!res.ok) throw new Error(`Twilio responded ${res.status}`);
    return { delivered: true };
  } catch (error) {
    console.error('[mailer] SMS confirmation failed', error);
    return { delivered: false };
  }
}

/**
 * Login alert — sent best-effort on every successful password login so an
 * account owner notices a sign-in they didn't expect. Never blocks or fails
 * the login itself; callers should fire this and not await its rejection
 * path affecting the response.
 */
export async function sendLoginAlertEmail(to: string, meta: { time: string; ip?: string }): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SDG 17 Hub <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[mailer:dev-fallback] Login alert for ${to} at ${meta.time}${meta.ip ? ` from ${meta.ip}` : ''} (RESEND_API_KEY not set)`);
    return { delivered: false };
  }

  try {
    await new Resend(apiKey).emails.send({
      from,
      to,
      subject: 'New sign-in to your SDG 17 Hub account',
      text: `Your account was just signed in to at ${meta.time}${meta.ip ? ` from ${meta.ip}` : ''}. If this was you, no action is needed. If it wasn't, reset your password immediately.`,
      html: `<p>Your account was just signed in to at <strong>${meta.time}</strong>${meta.ip ? ` from ${meta.ip}` : ''}.</p><p>If this was you, no action is needed. If it wasn't, reset your password immediately.</p>`
    });
    return { delivered: true };
  } catch (error) {
    console.error('[mailer] login alert failed', error);
    return { delivered: false };
  }
}
