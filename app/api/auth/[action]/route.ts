import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (action === "register") {
    const { email, name, password } = body;
    if (!email || !name || !password) return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    if (String(password).length < 6) return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    const exists = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (exists) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    const user = await prisma.user.create({
      data: { email: String(email).toLowerCase(), name: String(name), passwordHash: hashPassword(String(password)) },
    });
    // Seed defaults
    await prisma.settings.create({ data: { userId: user.id } });
    for (const t of ["TASK_DEADLINE", "WATER_REMINDER", "DAILY_RECAP"] as const) {
      await prisma.notificationPref.create({ data: { userId: user.id, type: t, minuteOfDay: t === "WATER_REMINDER" ? 780 : t === "DAILY_RECAP" ? 1290 : 420 } });
    }
    await ensureDemoData(user.id);
    await seedDefaultCategories(user.id);
    const token = createToken({ sub: user.id, email: user.email });
    const res = NextResponse.json({ ok: true, userId: user.id });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  }

  if (action === "login") {
    const { email, password } = body;
    if (!email || !password) return NextResponse.json({ error: "Email & password wajib" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }
    if (!(await prisma.settings.findUnique({ where: { userId: user.id } }))) {
      await prisma.settings.create({ data: { userId: user.id } });
      for (const t of ["TASK_DEADLINE", "WATER_REMINDER", "DAILY_RECAP"] as const) {
        await prisma.notificationPref.create({ data: { userId: user.id, type: t, minuteOfDay: t === "WATER_REMINDER" ? 780 : t === "DAILY_RECAP" ? 1290 : 420 } });
      }
    }
    const token = createToken({ sub: user.id, email: user.email });
    const res = NextResponse.json({ ok: true, userId: user.id });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return res;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

async function ensureDemoData(userId: string) {
  // Demo schedule blocks (jadwal rutin) & default categories handled in onboarding instead.
}

/** Default expense/income categories so quick-add works immediately for new users. */
async function seedDefaultCategories(userId: string) {
  const defaults: [string, string, string][] = [
    ["Makanan & Minuman", "🍜", "#f59e0b"],
    ["Transportasi", "🚌", "#3b82f6"],
    ["Sekolah & Alat Tulis", "📚", "#8b5cf6"],
    ["Hiburan", "🎮", "#ec4899"],
    ["Kesehatan", "💊", "#10b981"],
    ["Tabungan", "🏦", "#14b8a6"],
    ["Uang Masuk", "💰", "#22c55e"],
    ["Lain-lain", "📦", "#71717a"],
  ];
  await prisma.category.createMany({
    data: defaults.map(([name, icon, color]) => ({ userId, name, icon, color })),
  });
}