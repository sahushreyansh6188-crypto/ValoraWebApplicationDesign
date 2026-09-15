import { argon2id } from 'hash-wasm';
import crypto from 'node:crypto';

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
