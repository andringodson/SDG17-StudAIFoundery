/**
 * Pure calculation engines for every simulator. Kept dependency-free and
 * side-effect-free so they can be unit tested without a DOM or a database —
 * see test/formulas.test.mjs.
 */

export const FINANCE_MIN = 10_00_000;      // ₹10 Lakh
export const FINANCE_MAX = 50_00_00_000;   // ₹50 Crore
export const FINANCE_DEFAULT = 10_00_00_000; // ₹10 Crore

export interface FinanceResult {
  projects: number;
  communities: number;
  impact: number;
}

/**
 * Exactly the three formulas from the spec:
 *   Projects Supported  = floor(Budget / 4,00,000)
 *   Communities Reached = Projects × 200
 *   Impact Score        = min(99, 40 + floor(log10(Budget) × 7.5))
 */
export function financeModel(budget: number): FinanceResult {
  const b = Math.max(0, budget);
  const projects = Math.floor(b / 400_000);
  const communities = projects * 200;
  const impact = b > 0
    ? Math.min(99, 40 + Math.floor(Math.log10(b) * 7.5))
    : 0;
  return { projects, communities, impact };
}

/** Position 0..1000 on a log slider maps to a rupee amount in [min, max]. */
export function sliderToBudget(pos: number, steps = 1000, min = FINANCE_MIN, max = FINANCE_MAX): number {
  const t = Math.min(1, Math.max(0, pos / steps));
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return Math.round(Math.pow(10, logMin + t * (logMax - logMin)));
}

export function budgetToSlider(budget: number, steps = 1000, min = FINANCE_MIN, max = FINANCE_MAX): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const clamped = Math.min(max, Math.max(min, budget));
  const t = (Math.log10(clamped) - logMin) / (logMax - logMin);
  return Math.round(t * steps);
}

/* ---------------------------------------------------------------------------
   FAIR TRADE SIMULATOR
   The spec names the three inputs (trade value in ₹, barrier reduction %,
   tech infrastructure investment in ₹) and the three outputs, but does not
   pin exact weights. These are stated explicitly here so they can be
   argued with and adjusted in one place.
   --------------------------------------------------------------------------- */

export interface TradeInputs {
  tradeValue: number;        // ₹
  barrierReductionPct: number; // 0..100
  techInvestment: number;    // ₹
}

export interface TradeResult {
  growthScore: number;      // 0..100
  jobsScore: number;        // 0..100
  sustainabilityScore: number; // 0..100
}

const TRADE_VALUE_REF = 10_00_00_000;   // ₹10 Crore treated as a strong reference point
const TECH_INVEST_REF = 5_00_00_000;    // ₹5 Crore

export function tradeModel(input: TradeInputs): TradeResult {
  const tradeIdx = Math.min(1, Math.max(0, input.tradeValue) / TRADE_VALUE_REF);
  const barrierIdx = Math.min(1, Math.max(0, input.barrierReductionPct) / 100);
  const techIdx = Math.min(1, Math.max(0, input.techInvestment) / TECH_INVEST_REF);

  const growthScore = clamp(20 + tradeIdx * 35 + barrierIdx * 35 + techIdx * 10, 0, 100);
  const jobsScore = clamp(15 + tradeIdx * 25 + techIdx * 40 + barrierIdx * 20, 0, 100);
  const sustainabilityScore = clamp(25 + techIdx * 45 + barrierIdx * 10 - tradeIdx * 5, 0, 100);

  return {
    growthScore: round1(growthScore),
    jobsScore: round1(jobsScore),
    sustainabilityScore: round1(sustainabilityScore)
  };
}

/* ---------------------------------------------------------------------------
   ECOSYSTEM MATRIX — partnership strength + diagnostic warnings
   --------------------------------------------------------------------------- */

export type Stakeholder = 'government' | 'enterprise' | 'ngo' | 'university' | 'international' | 'community';

const STAKEHOLDER_WEIGHT: Record<Stakeholder, number> = {
  government: 22,
  enterprise: 20,
  ngo: 16,
  university: 15,
  international: 17,
  community: 18
};
const MAX_STAKEHOLDER_WEIGHT = Object.values(STAKEHOLDER_WEIGHT).reduce((a, b) => a + b, 0);

export interface EcosystemResult {
  score: number; // 0..100
  warnings: string[];
}

export function ecosystemModel(stakeholders: Stakeholder[], budget: number): EcosystemResult {
  const unique = Array.from(new Set(stakeholders));
  const capacity = unique.reduce((s, id) => s + (STAKEHOLDER_WEIGHT[id] ?? 0), 0) / MAX_STAKEHOLDER_WEIGHT;
  const diversity = unique.length / 6;
  const resourceIdx = Math.min(1, Math.log10(Math.max(budget, 1)) / Math.log10(100_00_00_000)); // ref ₹100 Cr

  const score = clamp((capacity * 0.45 + diversity * 0.25 + resourceIdx * 0.30) * 100, 0, 100);

  const warnings: string[] = [];
  const has = (id: Stakeholder) => unique.includes(id);

  if (!has('community') && (has('enterprise') || budget >= 10_00_00_000)) {
    warnings.push('High investment without Local Community inclusion reduces adoption probability by an estimated 35%.');
  }
  if (!has('government') && !has('international')) {
    warnings.push('No government or international body is present — there is no clear route to policy change or scale beyond a pilot.');
  }
  if (unique.length <= 1) {
    warnings.push('A single stakeholder type rarely covers finance, delivery, and legitimacy at once. Add at least one more.');
  }
  if (has('enterprise') && !has('university') && !has('ngo')) {
    warnings.push('Enterprise capital without an NGO or university partner risks optimising for return over reach.');
  }

  return { score: round1(score), warnings };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
