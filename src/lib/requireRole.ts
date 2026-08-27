import { redirect } from 'next/navigation';
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
