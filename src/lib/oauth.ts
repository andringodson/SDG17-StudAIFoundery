import crypto from 'node:crypto';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * Google/Facebook OAuth 2.0 (authorization-code flow), implemented directly
 * against each provider's HTTP endpoints — no SDK dependency. Both providers
 * are fully wired end to end (authorize -> callback -> token exchange ->
 * profile fetch -> find-or-create -> session), but stay inert without real
 * credentials: isGoogleConfigured()/isFacebookConfigured() gate every route,
 * and the login page only enables a button when its provider reports true.
 * Creating the actual OAuth app in Google Cloud / Meta for Developers is a
 * human, identity-verified step that can't be scripted — see README.md.
 */

export type OAuthProvider = 'google' | 'facebook';

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isFacebookConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function redirectUri(provider: OAuthProvider): string {
  return `${appUrl()}/api/auth/oauth/${provider}/callback`;
}

export function newOAuthState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function googleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri('google'),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function facebookAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID ?? '',
    redirect_uri: redirectUri('facebook'),
    response_type: 'code',
    scope: 'email public_profile',
    state
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  name: string | null;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri('google'),
      grant_type: 'authorization_code'
    })
  });
  if (!tokenRes.ok) throw new Error('Google token exchange failed.');
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  if (!infoRes.ok) throw new Error('Google profile fetch failed.');
  const info = (await infoRes.json()) as { sub: string; email?: string; name?: string };
  return { providerAccountId: info.sub, email: info.email ?? null, name: info.name ?? null };
}

export async function exchangeFacebookCode(code: string): Promise<OAuthProfile> {
  const tokenParams = new URLSearchParams({
    code,
    client_id: process.env.FACEBOOK_CLIENT_ID ?? '',
    client_secret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
    redirect_uri: redirectUri('facebook')
  });
  const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
  if (!tokenRes.ok) throw new Error('Facebook token exchange failed.');
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`);
  if (!infoRes.ok) throw new Error('Facebook profile fetch failed.');
  const info = (await infoRes.json()) as { id: string; email?: string; name?: string };
  return { providerAccountId: info.id, email: info.email ?? null, name: info.name ?? null };
}

interface LinkedUser { id: string; username: string; role: 'company' | 'investor' | 'general_user' | 'admin' | 'compliance_admin'; session_version: number }

/**
 * Links or creates a user for a verified OAuth profile:
 * 1. An existing link for this (provider, providerAccountId) -> that user.
 * 2. Else an existing user with this email -> link the provider to it
 *    (account linking: same person, new sign-in method).
 * 3. Else a brand-new general_user account. Its email counts as verified —
 *    Google/Facebook already proved it — and it gets a random, never-typed
 *    password hash; the person can set a real password later via
 *    "Forgot password" if they ever want username/password login too.
 */
export async function findOrCreateOAuthUser(provider: OAuthProvider, profile: OAuthProfile): Promise<LinkedUser> {
  const linked = await query<LinkedUser>(
    `SELECT u.id, u.username, u.role, u.session_version FROM oauth_accounts o
     JOIN users u ON u.id = o.user_id WHERE o.provider = $1 AND o.provider_account_id = $2`,
    [provider, profile.providerAccountId]
  );
  if (linked[0]) return linked[0];

  if (profile.email) {
    const byEmail = await query<LinkedUser>('SELECT id, username, role, session_version FROM users WHERE email = $1', [profile.email]);
    if (byEmail[0]) {
      await query(
        'INSERT INTO oauth_accounts (user_id, provider, provider_account_id, email) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [byEmail[0].id, provider, profile.providerAccountId, profile.email]
      );
      return byEmail[0];
    }
  }

  const base = (profile.email?.split('@')[0] ?? `${provider}user`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40) || provider;
  let username = base;
  for (let i = 0; await query('SELECT 1 FROM users WHERE username = $1', [username]).then((r) => r.length > 0); i++) {
    username = `${base}${i + 1}`;
  }

  const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
  const created = await query<LinkedUser>(
    `INSERT INTO users (username, email, password_hash, role, full_name, profile_completed_pct, is_email_verified)
     VALUES ($1, $2, $3, 'general_user', $4, 20, $5) RETURNING id, username, role, session_version`,
    [username, profile.email, passwordHash, profile.name ?? username, Boolean(profile.email)]
  );
  const user = created[0]!;
  await query('INSERT INTO user_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
  await query('INSERT INTO oauth_accounts (user_id, provider, provider_account_id, email) VALUES ($1, $2, $3, $4)', [user.id, provider, profile.providerAccountId, profile.email]);
  return user;
}
