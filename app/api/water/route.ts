import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, lastNDays } from "@/lib/wib";

/** GET /api/water?days=7 — today's total + history. */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const days = Number(req.nextUrl.searchParams.get("days") || 7);
  const from = lastNDays(days).at(0)!;
  const logs = await prisma.waterLog.findMany({ where: { userId, day: { gte: from } } });
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const target = settings?.waterTargetMl ?? 2000;
  const today = wibToday();
  const todayMl = logs.filter((l) => l.day === today).reduce((s, l) => s + l.amountMl, 0);
  const byDay = new Map<string, number>();
  for (const l of logs) byDay.set(l.day, (byDay.get(l.day) || 0) + l.amountMl);
  const history = [...byDay.entries()].map(([day, ml]) => ({ day, ml, hit: ml >= target })).sort((a, b) => a.day.localeCompare(b.day));
  const glassMl = settings?.glassMl ?? 250;
  return NextResponse.json({ todayMl, target, glassMl, history });
}

/** POST /api/water — add water. body: {amountMl} or {glasses} */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const glassMl = settings?.glassMl ?? 250;
  const amountMl = Number(body.amountMl || (body.glasses ? Number(body.glasses) * glassMl : 0));
  if (!amountMl || amountMl <= 0) return NextResponse.json({ error: "amountMl wajib" }, { status: 400 });
  const log = await prisma.waterLog.create({ data: { userId, day: wibToday(), amountMl } });
  const todayMl = await prisma.waterLog.aggregate({
    where: { userId, day: wibToday() },
    _sum: { amountMl: true },
  });
  return NextResponse.json({ log, todayMl: todayMl._sum.amountMl || 0 });
}

/** DELETE /api/water?id= — undo */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    await prisma.waterLog.deleteMany({ where: { id, userId } });
  } else {
    // undo last log today
    const last = await prisma.waterLog.findFirst({ where: { userId, day: wibToday() }, orderBy: { createdAt: "desc" } });
    if (last) await prisma.waterLog.delete({ where: { id: last.id } });
  }
  return NextResponse.json({ ok: true });
}