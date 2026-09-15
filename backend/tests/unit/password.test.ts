import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

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
});
