/**
 * Pure password validation — no I/O, unit tested in test/passwordStrength.test.mjs.
 * Requirements match the spec exactly: 8+ chars, one upper, one lower, one digit.
 */

export interface PasswordCheck {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  missing: string[];
}

export function checkPassword(password: string): PasswordCheck {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const valid = minLength && hasUpper && hasLower && hasDigit;

  const missing: string[] = [];
  if (!minLength) missing.push('at least 8 characters');
  if (!hasUpper) missing.push('an uppercase letter');
  if (!hasLower) missing.push('a lowercase letter');
  if (!hasDigit) missing.push('a number');

  let score = 0;
  if (minLength) score += 1;
  if (password.length >= 12) score += 1;
  if (hasUpper) score += 1;
  if (hasLower) score += 1;
  if (hasDigit) score += 1;
  if (hasSymbol) score += 1;

  const strength: PasswordCheck['strength'] = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

  return { minLength, hasUpper, hasLower, hasDigit, valid, strength, missing };
}
