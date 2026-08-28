/**
 * Directory shape shared between the /api/connect/directory route and the
 * ConnectHub client component, and the match-signal heuristic shown next to
 * each listing.
 *
 * This is NOT a machine-learning model and is never described as one — it is
 * a transparent, explainable scoring function over real profile fields
 * (sector/focus overlap + role complementarity), computed fresh on every
 * request from real database rows. No number here is fabricated; a listing
 * with no shared sector and no role complementarity honestly scores 0.
 */

export type ConnectRole = 'company' | 'investor' | 'government';

export interface DirectoryEntry {
  userId: string;
  role: ConnectRole;
  orgName: string;
  subtitle: string; // industry / investor type / department
  sector: string; // industry / preferred sector / focus area — the field matching runs on
  location: string; // "City, Country" or "Country"
}

/** Pairs of roles that most directly serve SDG 17's multi-stakeholder
 * partnership model (17.16/17.17): finance meeting delivery, policy meeting
 * both. Same-role pairs (two companies) still surface — just without the
 * complementarity bonus. */
const COMPLEMENTARY: Record<ConnectRole, ConnectRole[]> = {
  company: ['investor', 'government'],
  investor: ['company', 'government'],
  government: ['company', 'investor']
};

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2)
  );
}

/** 0–100. Two-thirds weight on sector/focus-area word overlap, one-third on
 * role complementarity — both computed directly from the two profiles
 * passed in, never looked up or cached. */
export function computeMatchScore(viewer: { role: ConnectRole; sector: string }, candidate: DirectoryEntry): number {
  const a = wordSet(viewer.sector);
  const b = wordSet(candidate.sector);
  let overlap = 0;
  if (a.size > 0 && b.size > 0) {
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    overlap = shared / Math.max(a.size, b.size); // Jaccard-ish, 0–1
  }
  const complementary = COMPLEMENTARY[viewer.role]?.includes(candidate.role) ? 1 : 0;
  const score = overlap * (2 / 3) + complementary * (1 / 3);
  return Math.round(score * 100);
}

export function matchLabel(score: number): string {
  if (score >= 60) return 'Strong match';
  if (score >= 30) return 'Worth exploring';
  return 'Different focus';
}
