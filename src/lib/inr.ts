/**
 * en-IN currency formatting. Every rupee figure in the app, the API, and the
 * bot goes through here — never a raw template string with "₹" + a number.
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const countFormatter = new Intl.NumberFormat('en-IN');

/** 10000000 -> "₹1,00,00,000" */
export function formatINR(value: number): string {
  return inrFormatter.format(Number.isFinite(value) ? value : 0);
}

function trimNum(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  if (rounded >= 100) return String(Math.round(rounded));
  return String(rounded).replace(/\.0$/, '');
}

/** 10000000 -> "₹1 Crore", 500000 -> "₹5 Lakh" */
export function formatINRShort(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `${sign}₹${trimNum(abs / 1_00_00_000)} Crore`;
  if (abs >= 1_00_000) return `${sign}₹${trimNum(abs / 1_00_000)} Lakh`;
  if (abs >= 1000) return `${sign}₹${trimNum(abs / 1000)}K`;
  return formatINR(n);
}

/** Indian-grouped plain integer, no currency symbol. */
export function formatCount(value: number): string {
  return countFormatter.format(Math.round(Number.isFinite(value) ? value : 0));
}
