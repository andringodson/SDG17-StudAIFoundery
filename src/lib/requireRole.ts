import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie, type SessionPayload, type UserRole } from './auth';
import { query } from './db';

/** Server-side route guard: redirects to login (no session) or the
 * Access Restricted page (wrong role) before a dashboard page renders
 * anything. This is what makes "you cannot manually visit another role's
 * dashboard" true — it is enforced here, not just hidden in the UI.
 *
 * Also checks the token's embedded sessionVersion against the current DB
 * value, so "log out of all devices" actually invalidates this token rather
 * than only looking like it did until the JWT's own 30-day expiry. */
export async function requireRole(...allowed: UserRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const rows = await query<{ session_version: number }>('SELECT session_version FROM users WHERE id = $1', [session.userId]);
  if (!rows[0] || rows[0].session_version !== session.sessionVersion) {
    await clearSessionCookie();
    redirect('/auth/login?expired=1');
  }

  if (!allowed.includes(session.role)) redirect('/dashboard/restricted');
  return session;
}

/** Same as requireRole but with no role allow-list — any signed-in account
 * (company, investor, government, general_user) may pass. Used by pages
 * that are shared across every role, like /connect, rather than gated to
 * a specific dashboard. */
export async function requireAnySession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const rows = await query<{ session_version: number }>('SELECT session_version FROM users WHERE id = $1', [session.userId]);
  if (!rows[0] || rows[0].session_version !== session.sessionVersion) {
    await clearSessionCookie();
    redirect('/auth/login?expired=1');
  }
  return session;
}

/** Same role/session-version check as requireRole, but for API route handlers:
 * returns a JSON 403/401 response instead of redirecting, since a fetch()
 * call has nowhere to be redirected to. Returns the session on success, or a
 * NextResponse the caller should return immediately. */
export async function requireApiRole(...allowed: UserRole[]): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const rows = await query<{ session_version: number }>('SELECT session_version FROM users WHERE id = $1', [session.userId]);
  if (!rows[0] || rows[0].session_version !== session.sessionVersion) {
    await clearSessionCookie();
    return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
  }
  if (!allowed.includes(session.role)) return NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 });
  return session;
}
