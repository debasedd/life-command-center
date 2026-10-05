import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  verifyPassword,
  sessionCookieOptions,
  SESSION_COOKIE,
  getOrCreateDefaultUser,
} from "@/lib/auth";

// Password auth is CPU-bound (scrypt); give it room but stay bounded.
export const maxDuration = 30;

/** Simple in-memory throttle: max attempts per IP within the window. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function throttled(ip: string): { limited: boolean; retryInSec: number } {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryInSec: 0 };
  }
  rec.count += 1;
  if (rec.count > MAX_ATTEMPTS) {
    return { limited: true, retryInSec: Math.ceil((rec.resetAt - now) / 1000) };
  }
  return { limited: false, retryInSec: 0 };
}

function clearThrottle(ip: string) {
  attempts.delete(ip);
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** POST /api/auth/login — { email, password } → sets the session cookie. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const gate = throttled(ip);
  if (gate.limited) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(gate.retryInSec / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(gate.retryInSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }

  // Bootstrap: if the account does not exist yet (fresh DB), create it with the
  // default password so a first-time deploy is not permanently locked out.
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await getOrCreateDefaultUser();
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  clearThrottle(ip);
  const token = createSessionToken(user.id);
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}