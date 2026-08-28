import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiRole } from '@/lib/requireRole';
import { handleApiError } from '@/lib/apiError';
import { askLlm, isLlmConfigured } from '@/lib/assistant/llm';
import { logAiAction } from '@/lib/assistant/tools';

interface ConnectionRow { id: string; user_a: string; user_b: string }

/**
 * AI-assisted opening message: given both organisations' real profile
 * fields, asks the configured LLM for a short, professional icebreaker a
 * human can edit before sending. Never sends anything itself — the draft is
 * returned to the compose box only, and every call is written to
 * ai_audit_log, same as every other assistant tool call on this platform.
 * 404s cleanly (no draft feature, not "AI is broken") when GROQ_API_KEY is
 * unset, exactly like the assistant's own LLM tier.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole('company', 'investor', 'government', 'general_user');
  if (session instanceof NextResponse) return session;

  if (!isLlmConfigured()) {
    return NextResponse.json({ error: 'Draft assistance is not configured on this deployment.' }, { status: 503 });
  }

  try {
    const { id } = await params;
    const rows = await query<ConnectionRow>('SELECT id, user_a, user_b FROM connections WHERE id = $1', [id]);
    const conn = rows[0];
    if (!conn || (conn.user_a !== session.userId && conn.user_b !== session.userId)) {
      return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
    }
    const otherId = conn.user_a === session.userId ? conn.user_b : conn.user_a;

    const [me, other] = await Promise.all([describeParty(session.userId), describeParty(otherId)]);

    const prompt =
      `Write a short, professional opening direct message (2–3 sentences, no greeting-only fluff, no markdown, no subject line) ` +
      `from "${me}" to "${other}" on an SDG 17 partnership platform, proposing to explore working together. ` +
      `Be specific about a plausible shared interest between the two, but do not invent numbers, budgets, or commitments.`;

    const llm = await askLlm(prompt);

    await logAiAction({
      userId: session.userId,
      role: session.role,
      toolName: 'connectIcebreaker',
      permissionDecision: 'allowed',
      resultStatus: llm ? 'success' : 'error',
      errorMessage: llm ? undefined : 'LLM returned no draft'
    });

    if (!llm) return NextResponse.json({ error: 'Could not generate a draft right now.' }, { status: 502 });
    return NextResponse.json({ draft: llm.text });
  } catch (err) {
    return handleApiError(err);
  }
}

async function describeParty(userId: string): Promise<string> {
  const rows = await query<{ company_name?: string; agency_name?: string; organisation_name?: string; investor_type?: string; username: string; role: string }>(
    `SELECT u.username, u.role, cp.company_name, gp.agency_name, ip.organisation_name, ip.investor_type
     FROM users u
     LEFT JOIN company_profiles cp ON cp.user_id = u.id
     LEFT JOIN government_profiles gp ON gp.user_id = u.id
     LEFT JOIN investor_profiles ip ON ip.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const r = rows[0];
  if (!r) return 'a platform member';
  return r.company_name || r.agency_name || r.organisation_name || r.investor_type || r.username;
}
