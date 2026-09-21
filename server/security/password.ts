import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * scrypt is a memory-hard KDF available in Node's standard library, so we get
 * a strong password hash with no third-party dependency.
 */
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEM = 128 * 1024 * 1024;

/** Encoded as `scrypt$N$r$p$salt$hash`, both blobs base64. */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    ...SCRYPT,
    maxmem: MAX_MEM,
  });

  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const N = Number(n);
  const rr = Number(r);
  const pp = Number(p);
  if (![N, rr, pp].every((value) => Number.isInteger(value) && value > 0)) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length, {
      N,
      r: rr,
      p: pp,
      maxmem: MAX_MEM,
    });
  } catch {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
