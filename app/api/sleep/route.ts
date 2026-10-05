import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, lastNDays } from "@/lib/wib";

/** GET /api/sleep?days=14 */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const days = Number(req.nextUrl.searchParams.get("days") || 14);
  const from = lastNDays(days).at(0)!;
  const logs = await prisma.sleepLog.findMany({
    where: { userId, day: { gte: from } },
    orderBy: { day: "desc" },
  });
  return NextResponse.json({ logs });
}

/** POST /api/sleep — upsert by day. body: {day?, bedTime:"23:30", wakeTime:"06:00", quality?} */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const toMin = (t: unknown) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t ?? ""));
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (h > 23 || mm > 59) return null;
    return h * 60 + mm;
  };
  const bedMinute = toMin(body.bedTime);
  const wakeMinute = toMin(body.wakeTime);
  if (bedMinute == null || wakeMinute == null) return NextResponse.json({ error: "Format jam: HH:MM" }, { status: 400 });
  const day = body.day || wibToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Format tanggal: YYYY-MM-DD" }, { status: 400 });
  const quality = body.quality == null || body.quality === "" ? null : Number(body.quality);
  if (quality != null && (!Number.isFinite(quality) || quality < 1 || quality > 5))
    return NextResponse.json({ error: "Kualitas harus 1-5" }, { status: 400 });
  const log = await prisma.sleepLog.upsert({
    where: { userId_day: { userId, day } },
    update: { bedMinute, wakeMinute, quality },
    create: { userId, day, bedMinute, wakeMinute, quality },
  });
  return NextResponse.json({ log });
}

/** DELETE /api/sleep?id= */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await prisma.sleepLog.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}