import crypto from "node:crypto";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const SESSION_COOKIE = "lcc_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(data: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(data).digest());
}

export function createToken(payload: { sub: string; email: string }): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(
    Buffer.from(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + MAX_AGE,
      })
    )
  );
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  if (sign(`${h}.${b}`) !== s) return null;
  try {
    const payload = JSON.parse(Buffer.from(b, "base64url").toString());
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false, // local dev over http://localhost
    maxAge: MAX_AGE,
    path: "/",
  };
}

/** Get the authenticated user id from cookies (server components / route handlers). */
export async function getAuthUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token)?.sub ?? null;
}