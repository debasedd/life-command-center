import crypto from "node:crypto";

/**
 * Password hashing helpers.
 *
 * Kept separate from lib/auth.ts on purpose: the seed script and any plain
 * Node tooling must be able to hash a password without pulling in
 * `next/headers`, which only exists inside the Next runtime.
 *
 * Format: `salt:hash` (hex), using scrypt — matching the hashes the original
 * seed wrote, so existing accounts keep working.
 */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

/** Constant-time verify. Returns false for placeholder hashes like "-". */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  let actual: string;
  try {
    actual = crypto.scryptSync(password, salt, 64).toString("hex");
  } catch {
    return false;
  }
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}