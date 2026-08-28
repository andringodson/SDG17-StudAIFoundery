import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificatePdf, createStrategyReportRtf } from '../src/lib/downloads.ts';

test('certificate PDF uses one landscape page with a centered learning pathway title', () => {
  const pdf = new TextDecoder().decode(createCertificatePdf('NGO Worker', new Date('2026-08-28T00:00:00Z')));
  assert.match(pdf, /^%PDF-1.4/);
  assert.match(pdf, /\/MediaBox \[0 0 842 595\]/);
  assert.match(pdf, /\(NGO Worker Learning Pathway\) Tj/);
  assert.match(pdf, /Certificate of Completion/);
});

test('strategy report is a styled RTF document and safely encodes Unicode content', () => {
  const report = createStrategyReportRtf({ stakeholderNames: ['Government', 'NGO'], budget: '₹1,00,00,000', score: 84, warnings: ['Include community partners.'], generatedOn: new Date('2026-08-28T00:00:00Z') });
  assert.match(report, /^\{\\rtf1/);
  assert.match(report, /Partnership Strategy Report/);
  assert.match(report, /\\u8377\?/);
  assert.match(report, /\\bullet/);
});
