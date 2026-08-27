import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword } from '../src/lib/passwordStrength.ts';

test('rejects passwords under 8 characters', () => {
  assert.equal(checkPassword('Ab1').valid, false);
});

test('rejects passwords missing an uppercase letter', () => {
  const r = checkPassword('abcdefg1');
  assert.equal(r.valid, false);
  assert.ok(r.missing.includes('an uppercase letter'));
});

test('rejects passwords missing a digit', () => {
  const r = checkPassword('Abcdefgh');
  assert.equal(r.valid, false);
  assert.ok(r.missing.includes('a number'));
});

test('accepts a password meeting all four spec requirements', () => {
  const r = checkPassword('Abcdefg1');
  assert.equal(r.valid, true);
  assert.deepEqual(r.missing, []);
});

test('strength scales from weak to strong', () => {
  assert.equal(checkPassword('aaaaaaaa').strength, 'weak');
  assert.equal(checkPassword('Abcdefg1').strength, 'medium');
  assert.equal(checkPassword('Abcdefg1!2345').strength, 'strong');
});
