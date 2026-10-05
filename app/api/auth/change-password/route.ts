import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getAuthUserId,
  verifyPassword,
  hashPassword,
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

/** POST /api/auth/change-password — { currentPassword, newPassword } */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const current = String(body.currentPassword || "");
  const next = String(body.newPassword || "");

  if (next.length < 8) {
    return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
  }
  if (next.length > 200) {
    return NextResponse.json({ error: "Password terlalu panjang" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Require the current password, unless the account still holds the seeded
  // default — in that case the owner never chose one yet, so don't lock them out.
  const isDefaultHash = !user.passwordHash || !user.passwordHash.includes(":");
  if (!isDefaultHash && !verifyPassword(current, user.passwordHash)) {
    return NextResponse.json({ error: "Password saat ini salah" }, { status: 401 });
  }

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(next) } });

  // Re-issue the session so the current device stays signed in.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions());
  return res;
}