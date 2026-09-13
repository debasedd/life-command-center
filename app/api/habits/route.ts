import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, lastNDays, wibWeekday } from "@/lib/wib";

/** GET /api/habits — habits + today checkins + streaks. */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const habits = await prisma.habit.findMany({ where: { userId, archived: false }, orderBy: { createdAt: "asc" } });
  const today = wibToday();
  const checkins = await prisma.habitCheckin.findMany({ where: { userId, day: today } });
  // streak per habit: consecutive days ending today (or yesterday)
  const allCheckins = await prisma.habitCheckin.findMany({ where: { userId } });
  const streaks: Record<string, { current: number; best: number }> = {};
  for (const h of habits) {
    const days = new Set(allCheckins.filter((c) => c.habitId === h.id).map((c) => c.day));
    let current = 0;
    let cursor = days.has(today) ? today : wibMinus1(today);
    while (days.has(cursor)) {
      current++;
      cursor = wibMinus1(cursor);
    }
    // best: longest run
    const sorted = [...days].sort();
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of sorted) {
      run = prev && wibMinus1(d) === prev ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    streaks[h.id] = { current, best };
  }
  const weekDays = lastNDays(7);
  const weeklyCount: Record<string, number> = {};
  for (const h of habits) weeklyCount[h.id] = allCheckins.filter((c) => c.habitId === h.id && weekDays.includes(c.day)).length;
  return NextResponse.json({ habits, checkins, streaks, weeklyCount });
}

/** POST /api/habits — create habit. */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "Nama habit wajib" }, { status: 400 });
  const habit = await prisma.habit.create({
    data: { userId, name: String(body.name).trim(), icon: body.icon || "✅", targetPerWeek: Number(body.targetPerWeek) || 7 },
  });
  return NextResponse.json({ habit });
}

/** PATCH /api/habits — toggle checkin {id, day?} */
export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const habit = await prisma.habit.findFirst({ where: { id: body.id, userId } });
  if (!habit) return NextResponse.json({ error: "Habit tidak ditemukan" }, { status: 404 });
  const day = body.day || wibToday();
  const existing = await prisma.habitCheckin.findUnique({
    where: { habitId_day: { habitId: habit.id, day } },
  });
  if (existing) {
    await prisma.habitCheckin.delete({ where: { id: existing.id } });
    return NextResponse.json({ checked: false });
  }
  await prisma.habitCheckin.create({ data: { userId, habitId: habit.id, day } });
  return NextResponse.json({ checked: true });
}

/** DELETE /api/habits?id= */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await prisma.habit.updateMany({ where: { id, userId }, data: { archived: true } });
  await prisma.habitCheckin.deleteMany({ where: { habitId: id } });
  return NextResponse.json({ ok: true });
}

function wibMinus1(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}