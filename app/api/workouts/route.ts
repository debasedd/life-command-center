import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, dayOffset, lastNDays } from "@/lib/wib";

/** GET /api/workouts?days=30 — list + stats. */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const days = Number(req.nextUrl.searchParams.get("days") || 30);
  const from = lastNDays(days).at(0)!;
  const workouts = await prisma.workout.findMany({
    where: { userId, day: { gte: from } },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
  });
  const today = wibToday();
  const thisWeek = lastNDays(7);
  const lastWeek = lastNDays(7, dayOffset(today, -7));
  const inWeek = (w: { day: string }, days_: string[]) => days_.includes(w.day);
  const thisWeekCount = workouts.filter((w) => inWeek(w, thisWeek)).length;
  const lastWeekCount = workouts.filter((w) => inWeek(w, lastWeek)).length;
  const thisWeekMinutes = workouts.filter((w) => inWeek(w, thisWeek)).reduce((s, w) => s + w.durationMinutes, 0);
  // streak: consecutive days (from today backwards) with ≥1 workout
  const daysWith = new Set(workouts.map((w) => w.day));
  let streak = 0;
  let cursor = daysWith.has(today) ? today : dayOffset(today, -1);
  if (!daysWith.has(today)) {
    // streak counts from yesterday backwards
  }
  while (daysWith.has(cursor)) {
    streak++;
    cursor = dayOffset(cursor, -1);
  }
  const byType = new Map<string, number>();
  for (const w of workouts) byType.set(w.type, (byType.get(w.type) || 0) + 1);
  return NextResponse.json({
    workouts,
    stats: { thisWeekCount, lastWeekCount, thisWeekMinutes, streak, daysWith: [...daysWith], byType: Object.fromEntries(byType) },
  });
}

/** POST /api/workouts */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { type, durationMinutes, intensity, notes, day } = body;
  if (!type || !durationMinutes || Number(durationMinutes) <= 0)
    return NextResponse.json({ error: "Jenis & durasi wajib" }, { status: 400 });
  const workout = await prisma.workout.create({
    data: {
      userId,
      type: String(type),
      durationMinutes: Number(durationMinutes),
      intensity: intensity || "SEDANG",
      notes: notes || null,
      day: day || wibToday(),
    },
  });
  return NextResponse.json({ workout });
}

/** DELETE /api/workouts?id= */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await prisma.workout.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}