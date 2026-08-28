import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOtp, verifyOtp, generateLinkToken, OTP_LENGTH, OTP_TTL_MS } from '../src/lib/otp.ts';

test('generateOtp produces a zero-padded code of the right length', () => {
  for (let i = 0; i < 50; i += 1) {
    const { code } = generateOtp();
    assert.equal(code.length, OTP_LENGTH);
    assert.match(code, /^\d+$/);
  }
});

test('generateOtp sets an expiry OTP_TTL_MS out', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const { expiresAt } = generateOtp(now);
  assert.equal(expiresAt.getTime() - now.getTime(), OTP_TTL_MS);
});

test('verifyOtp: correct code before expiry passes', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const stored = { code: '123456', expiresAt: new Date(now.getTime() + 60_000) };
  assert.equal(verifyOtp('123456', stored, now), 'ok');
});

test('verifyOtp: wrong code fails as mismatch', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const stored = { code: '123456', expiresAt: new Date(now.getTime() + 60_000) };
  assert.equal(verifyOtp('000000', stored, now), 'mismatch');
});

test('verifyOtp: expired code fails as expired even if digits match', () => {
  const now = new Date('2026-01-01T00:10:01Z');
  const stored = { code: '123456', expiresAt: new Date('2026-01-01T00:10:00Z') };
  assert.equal(verifyOtp('123456', stored, now), 'expired');
});

test('verifyOtp: missing stored record fails as missing', () => {
  assert.equal(verifyOtp('123456', null), 'missing');
  assert.equal(verifyOtp('123456', { code: null, expiresAt: null }), 'missing');
});

test('generateLinkToken returns a sufficiently long, unique hex string', () => {
  const a = generateLinkToken();
  const b = generateLinkToken();
  assert.match(a, /^[0-9a-f]{48}$/);
  assert.notEqual(a, b);
});
