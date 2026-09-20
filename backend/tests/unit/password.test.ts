import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../src/utils/password.js';

describe('Argon2id Password Security Module', () => {
  test('hashes password using encoded Argon2id format and successfully verifies', async () => {
    const rawPassword = 'Password123!Secure';
    const hash = await hashPassword(rawPassword);

    assert.ok(hash.startsWith('$argon2id$'), 'Expected hash to start with $argon2id$');

    const isValid = await verifyPassword(hash, rawPassword);
    assert.strictEqual(isValid, true, 'Expected password to verify successfully');

    const isInvalid = await verifyPassword(hash, 'WrongPassword456!');
    assert.strictEqual(isInvalid, false, 'Expected wrong password to fail verification');
  });

  test('validates password strength and rejects weak or common passwords', () => {
    const weak = validatePasswordStrength('short');
    assert.strictEqual(weak.isValid, false);
    assert.ok(weak.feedback.some((f) => f.includes('8 characters')));

    const common = validatePasswordStrength('password123');
    assert.strictEqual(common.isValid, false);
    assert.ok(common.feedback.some((f) => f.includes('too common')));

    const noSpecial = validatePasswordStrength('Password1234');
    assert.strictEqual(noSpecial.isValid, false);
    assert.ok(noSpecial.feedback.some((f) => f.includes('special character')));

    const strong = validatePasswordStrength('Valora@2026Secure!');
    assert.strictEqual(strong.isValid, true);
    assert.strictEqual(strong.feedback.length, 0);
    assert.ok(strong.score >= 3);
  });
});

