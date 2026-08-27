import test from 'node:test';
import assert from 'node:assert/strict';
import {
  financeModel,
  sliderToBudget,
  budgetToSlider,
  tradeModel,
  ecosystemModel,
  FINANCE_MIN,
  FINANCE_MAX,
  FINANCE_DEFAULT
} from '../src/lib/formulas.ts';

test('financeModel: exact spec example — ₹10 Crore', () => {
  // Projects = floor(100000000 / 400000) = 250
  // Communities = 250 * 200 = 50000
  // Impact = min(99, 40 + floor(log10(1e8) * 7.5)) = min(99, 40 + floor(8*7.5)) = min(99, 100) = 99
  const r = financeModel(FINANCE_DEFAULT);
  assert.equal(r.projects, 250);
  assert.equal(r.communities, 50_000);
  assert.equal(r.impact, 99);
});

test('financeModel: ₹10 Lakh floor', () => {
  // Projects = floor(1000000/400000) = 2
  const r = financeModel(FINANCE_MIN);
  assert.equal(r.projects, 2);
  assert.equal(r.communities, 400);
  // log10(1e6)=6 -> 40+floor(6*7.5)=40+45=85
  assert.equal(r.impact, 85);
});

test('financeModel: ₹50 Crore upper bound clamps impact to 99', () => {
  const r = financeModel(FINANCE_MAX);
  assert.ok(r.impact <= 99);
});

test('financeModel: zero budget produces zero everywhere, no NaN/-Infinity', () => {
  const r = financeModel(0);
  assert.equal(r.projects, 0);
  assert.equal(r.communities, 0);
  assert.equal(r.impact, 0);
});

test('financeModel: negative budget is clamped to zero, not negative output', () => {
  const r = financeModel(-500);
  assert.equal(r.projects, 0);
  assert.equal(r.communities, 0);
});

test('slider <-> budget round-trip is monotonic and covers the full range', () => {
  const lo = sliderToBudget(0);
  const hi = sliderToBudget(1000);
  assert.equal(lo, FINANCE_MIN);
  assert.equal(hi, FINANCE_MAX);
  // Monotonic increasing across the whole range.
  let prev = -Infinity;
  for (let p = 0; p <= 1000; p += 50) {
    const b = sliderToBudget(p);
    assert.ok(b >= prev, `budget should not decrease as slider increases (pos=${p})`);
    prev = b;
  }
});

test('budgetToSlider inverts sliderToBudget within rounding tolerance', () => {
  for (const pos of [0, 100, 250, 500, 750, 1000]) {
    const budget = sliderToBudget(pos);
    const back = budgetToSlider(budget);
    assert.ok(Math.abs(back - pos) <= 2, `pos=${pos} round-tripped to ${back}`);
  }
});

test('tradeModel: all scores stay within 0..100 across extremes', () => {
  const cases = [
    { tradeValue: 0, barrierReductionPct: 0, techInvestment: 0 },
    { tradeValue: 1e12, barrierReductionPct: 100, techInvestment: 1e12 },
    { tradeValue: -100, barrierReductionPct: -5, techInvestment: -1 }
  ];
  for (const c of cases) {
    const r = tradeModel(c);
    for (const v of [r.growthScore, r.jobsScore, r.sustainabilityScore]) {
      assert.ok(v >= 0 && v <= 100, `score out of range: ${v}`);
    }
  }
});

test('tradeModel: more of every input never decreases growth or jobs scores', () => {
  const base = tradeModel({ tradeValue: 1_00_00_000, barrierReductionPct: 20, techInvestment: 50_00_000 });
  const more = tradeModel({ tradeValue: 5_00_00_000, barrierReductionPct: 60, techInvestment: 2_00_00_000 });
  assert.ok(more.growthScore >= base.growthScore);
  assert.ok(more.jobsScore >= base.jobsScore);
});

test('ecosystemModel: warns when enterprise-scale budget lacks community stakeholder', () => {
  const r = ecosystemModel(['enterprise', 'government'], 20_00_00_000);
  assert.ok(r.warnings.some((w) => w.includes('Local Community')));
});

test('ecosystemModel: no warnings for a well-rounded partnership', () => {
  const r = ecosystemModel(['government', 'community', 'university'], 5_00_00_000);
  assert.ok(!r.warnings.some((w) => w.includes('Local Community')));
  assert.ok(!r.warnings.some((w) => w.includes('policy change')));
});

test('ecosystemModel: score is within 0..100 and duplicates do not double-count', () => {
  const withDup = ecosystemModel(['government', 'government', 'government'], 1_00_000);
  const withoutDup = ecosystemModel(['government'], 1_00_000);
  assert.equal(withDup.score, withoutDup.score);
  assert.ok(withDup.score >= 0 && withDup.score <= 100);
});

test('ecosystemModel: single stakeholder triggers the narrow-coverage warning', () => {
  const r = ecosystemModel(['ngo'], 1_00_000);
  assert.ok(r.warnings.some((w) => w.includes('single stakeholder')));
});
