import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export { hashPassword, verifyPassword };

/**
 * Single-user auth with password login.
 *
 * Design notes:
 *  - Session is a stateless HMAC-signed token in an httpOnly cookie, so no
 *    server-side session store is needed and it survives serverless cold starts.
 *  - `getAuthUserId()` keeps its original signature: every API route already
 *    calls it and 401s on falsy, so they needed no changes.
 *  - Password hashing: scrypt with a per-user random salt, same format the
 *    seed script writes (`salt:hash`).
 */

const COOKIE_NAME = "lcc_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_EMAIL = "demo@lifec.id";
const DEFAULT_NAME = "Fatih";

/** Signing key. Falls back to CRON_SECRET so a missing env never silently
 *  produces unsigned (and therefore forgeable) sessions. */
function signingSecret(): string {
  const s = process.env.SESSION_SECRET || process.env.CRON_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET or CRON_SECRET must be set to issue sessions");
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Build a signed session token: base64url(payload).base64url(hmac). */
export function createSessionToken(userId: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = b64url(Buffer.from(JSON.stringify({ uid: userId, exp }), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", signingSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Verify token signature + expiry. Returns the userId, or null. */
export function readSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expectedSig: string;
  try {
    expectedSig = b64url(crypto.createHmac("sha256", signingSecret()).update(payload).digest());
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(payload).toString("utf8")) as { uid?: string; exp?: number };
    if (!data.uid || typeof data.exp !== "number") return null;
    if (Date.now() >= data.exp) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export const SESSION_COOKIE = COOKIE_NAME;

/**
 * Resolve the signed-in user.
 *
 * Accepts the session cookie (browsers) or an `Authorization: Bearer <token>`
 * header (iOS Shortcuts, which cannot hold a cookie). Returns null when the
 * token is absent, invalid, or expired — callers already treat falsy as
 * "unauthorized", which preserves the original contract.
 */
export async function getAuthUserId(): Promise<string | null> {
  const jar = await cookies();
  let uid = readSessionToken(jar.get(COOKIE_NAME)?.value);
  if (!uid) {
    const header = (await headers()).get("authorization");
    if (header && /^Bearer\s+/i.test(header)) {
      uid = readSessionToken(header.replace(/^Bearer\s+/i, "").trim());
    }
  }
  if (!uid) return null;
  // Confirm the user still exists so a deleted account can't ride a stale token.
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true } });
  return user ? user.id : null;
}

/**
 * Used only by the bootstrap/setup path and the cron worker, which run without
 * a browser session. Creates the user on first call.
 */
export async function getOrCreateDefaultUser(): Promise<string> {
  let user = await prisma.user.findUnique({ where: { email: DEFAULT_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: DEFAULT_EMAIL, name: DEFAULT_NAME, passwordHash: hashPassword("demo123") },
    });
    await prisma.settings.create({ data: { userId: user.id } });
  }
  return user.id;
}
