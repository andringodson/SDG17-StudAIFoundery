import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isFacebookConfigured, exchangeFacebookCode, findOrCreateOAuthUser } from '@/lib/oauth';
import { setSessionCookie } from '@/lib/auth';
import { sendLoginAlertEmail } from '@/lib/mailer';

const ROLE_HOME: Record<string, string> = {
  company: '/dashboard/company', investor: '/dashboard/investor', general_user: '/dashboard/general',
  admin: '/dashboard/admin', compliance_admin: '/dashboard/admin'
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const appOrigin = url.origin;
  if (!isFacebookConfigured()) return NextResponse.redirect(`${appOrigin}/auth/login?oauthError=not_configured`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const store = await cookies();
  const expectedState = store.get('oauth_state_facebook')?.value;
  store.delete('oauth_state_facebook');

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appOrigin}/auth/login?oauthError=invalid_state`);
  }

  try {
    const profile = await exchangeFacebookCode(code);
    const user = await findOrCreateOAuthUser('facebook', profile);
    await setSessionCookie({ userId: user.id, username: user.username, role: user.role, sessionVersion: user.session_version });
    if (user.email) await sendLoginAlertEmail(user.email, { time: new Date().toISOString() });
    return NextResponse.redirect(`${appOrigin}${ROLE_HOME[user.role] ?? '/dashboard/general'}`);
  } catch {
    return NextResponse.redirect(`${appOrigin}/auth/login?oauthError=exchange_failed`);
  }
}
