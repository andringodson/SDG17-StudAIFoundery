import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { handleApiError } from '@/lib/apiError';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const rows = await query(
      `SELECT finance_budget_inr, gamification_points, earned_badges, active_partnerships,
              pledge_text, last_completed_step, updated_at
       FROM user_progress WHERE user_id = $1`,
      [session.userId]
    );
    return NextResponse.json({ progress: rows[0] ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}

const Body = z.object({
  financeBudgetInr: z.number().min(0).optional(),
  gamificationPoints: z.number().int().min(0).optional(),
  earnedBadges: z.array(z.string()).optional(),
  activePartnerships: z.array(z.unknown()).optional(),
  pledgeText: z.string().max(240).nullable().optional(),
  lastCompletedStep: z.number().int().min(1).max(4).optional()
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const p = parsed.data;

    await query(
      `INSERT INTO user_progress (user_id, finance_budget_inr, gamification_points, earned_badges, active_partnerships, pledge_text, last_completed_step, updated_at)
       VALUES ($1, COALESCE($2, 10000000), COALESCE($3, 0), COALESCE($4, '[]'::jsonb), COALESCE($5, '[]'::jsonb), $6, COALESCE($7, 1), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         finance_budget_inr = COALESCE($2, user_progress.finance_budget_inr),
         gamification_points = COALESCE($3, user_progress.gamification_points),
         earned_badges = COALESCE($4, user_progress.earned_badges),
         active_partnerships = COALESCE($5, user_progress.active_partnerships),
         pledge_text = COALESCE($6, user_progress.pledge_text),
         last_completed_step = COALESCE($7, user_progress.last_completed_step),
         updated_at = NOW()`,
      [
        session.userId,
        p.financeBudgetInr ?? null,
        p.gamificationPoints ?? null,
        p.earnedBadges ? JSON.stringify(p.earnedBadges) : null,
        p.activePartnerships ? JSON.stringify(p.activePartnerships) : null,
        p.pledgeText ?? null,
        p.lastCompletedStep ?? null
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
