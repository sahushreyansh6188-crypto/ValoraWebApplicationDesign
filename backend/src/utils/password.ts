import { argon2id } from 'hash-wasm';
import crypto from 'node:crypto';

// Commonly compromised or easily guessable passwords blacklist
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'valora123',
  'iloveyou',
  'admin123',
  'welcome123',
  'secret123',
]);

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4
  feedback: string[];
}

/**
 * Validates password strength according to NIST SP 800-63B guidelines
 * Requires at least 8 characters, with uppercase, lowercase, digits, and special characters.
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
    return { isValid: false, score: 0, feedback };
  }

  score += 1;

  if (password.length >= 12) {
    score += 1;
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasLower) feedback.push('Password must include at least one lowercase letter');
  if (!hasUpper) feedback.push('Password must include at least one uppercase letter');
  if (!hasDigit) feedback.push('Password must include at least one number');
  if (!hasSpecial) feedback.push('Password must include at least one special character (!@#$%^&*...)');

  if (hasLower && hasUpper && hasDigit && hasSpecial) {
    score += 1;
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    feedback.push('This password is too common and easily guessed. Please choose a stronger password.');
    return { isValid: false, score: Math.min(score, 1), feedback };
  }

  const isValid = feedback.length === 0;
  if (isValid && score < 4 && password.length >= 14) {
    score = 4;
  }

  return {
    isValid,
    score: Math.min(4, Math.max(0, score)),
    feedback,
  };
}

/**
 * Hashes password using RFC 9106 Argon2id (via WebAssembly)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456, // 19 MiB
    hashLength: 32,
    outputType: 'encoded',
  });
  return hash;
}

/**
 * Verifies password against an Argon2id encoded string
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    // Parse salt from encoded Argon2 string: $argon2id$v=19$m=...,t=...,p=...$<salt>$<hash>
    const parts = hash.split('$');
    if (parts.length < 6) return false;
    const saltB64 = parts[4];
    const salt = Buffer.from(saltB64, 'base64');

    const computed = await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 2,
      memorySize: 19456,
      hashLength: 32,
      outputType: 'encoded',
    });

    return computed === hash;
  } catch (err) {
    return false;
  }
}

