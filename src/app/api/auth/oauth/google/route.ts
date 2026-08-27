import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isGoogleConfigured, googleAuthorizeUrl, newOAuthState } from '@/lib/oauth';

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: 'Google sign-in is not configured on this deployment yet.' }, { status: 501 });
  }
  const state = newOAuthState();
  const store = await cookies();
  store.set('oauth_state_google', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return NextResponse.redirect(googleAuthorizeUrl(state));
}
