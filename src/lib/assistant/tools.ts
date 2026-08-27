import { query } from '@/lib/db';
import { formatINR, formatCount } from '@/lib/inr';
import type { SessionPayload } from '@/lib/auth';

/**
 * Every "tool" the assistant can call. Each one:
 *   - takes the authenticated session (never a raw user id from the request)
 *   - only ever reads/writes rows scoped to that session's own user_id
 *   - returns plain data — no tool ever fabricates numbers that aren't in
 *     the database (no invented portfolio values, matches, or valuations)
 *
 * There is exactly one write-capable tool (createReminder), and it is the
 * least sensitive action available — nothing is sent, messaged, or paid as
 * a direct result of the assistant acting alone.
 */

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function getProfile(session: SessionPayload): Promise<ToolResult> {
  const rows = await query<{
    username: string; email: string | null; role: string;
    is_email_verified: boolean; profile_completed_pct: number; created_at: string;
  }>(
    'SELECT username, email, role, is_email_verified, profile_completed_pct, created_at FROM users WHERE id = $1',
    [session.userId]
  );
  if (!rows[0]) return { ok: false, error: 'not_found' };
  return { ok: true, data: rows[0] };
}

export async function getProgressSummary(session: SessionPayload): Promise<ToolResult> {
  const rows = await query<{
    finance_budget_inr: string; gamification_points: number; earned_badges: string[];
  }>(
    'SELECT finance_budget_inr, gamification_points, earned_badges FROM user_progress WHERE user_id = $1',
    [session.userId]
  );
  const row = rows[0];
  if (!row) return { ok: true, data: { points: 0, badges: [], financeBudget: 0 } };
  return {
    ok: true,
    data: {
      points: row.gamification_points,
      badges: row.earned_badges,
      financeBudget: Number(row.finance_budget_inr),
      financeBudgetFormatted: formatINR(Number(row.finance_budget_inr))
    }
  };
}

export async function getMyPledges(session: SessionPayload): Promise<ToolResult> {
  const rows = await query<{ pledge_text: string; created_at: string }>(
    'SELECT pledge_text, created_at FROM pledges WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [session.userId]
  );
  return { ok: true, data: rows };
}

export async function listReminders(session: SessionPayload): Promise<ToolResult> {
  const rows = await query<{ id: string; note: string; remind_at: string }>(
    'SELECT id, note, remind_at FROM ai_reminders WHERE user_id = $1 ORDER BY remind_at ASC LIMIT 20',
    [session.userId]
  );
  return { ok: true, data: rows };
}

/** The one write tool. Callers must have already shown the user a
 * confirm/edit/cancel step — this function itself does not ask again. */
export async function createReminder(session: SessionPayload, note: string, remindAt: Date): Promise<ToolResult> {
  if (!note.trim()) return { ok: false, error: 'empty_note' };
  await query('INSERT INTO ai_reminders (user_id, note, remind_at) VALUES ($1, $2, $3)', [
    session.userId, note.trim().slice(0, 500), remindAt
  ]);
  return { ok: true, data: { note, remindAt: remindAt.toISOString() } };
}

export function formatBadgeCount(badges: unknown): string {
  return Array.isArray(badges) ? formatCount(badges.length) : '0';
}

/**
 * Audit trail. Called for every tool invocation regardless of outcome —
 * this is what "the AI cannot act invisibly" actually means in code.
 */
export async function logAiAction(entry: {
  userId: string | null;
  role: string | null;
  toolName: string;
  permissionDecision: 'allowed' | 'denied';
  confirmationStatus?: 'not_required' | 'pending' | 'confirmed' | 'cancelled';
  resultStatus: 'success' | 'error' | 'denied';
  errorMessage?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO ai_audit_log (user_id, user_role, tool_name, permission_decision, confirmation_status, result_status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.userId, entry.role, entry.toolName, entry.permissionDecision,
        entry.confirmationStatus ?? 'not_required', entry.resultStatus, entry.errorMessage ?? null
      ]
    );
  } catch {
    // Audit logging must never break the user-facing response — if the DB
    // write fails we still returned the answer; we just lost this one log row.
  }
}
