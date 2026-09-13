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
  const toMin = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const bedMinute = toMin(body.bedTime);
  const wakeMinute = toMin(body.wakeTime);
  if (bedMinute == null || wakeMinute == null) return NextResponse.json({ error: "Format jam: HH:MM" }, { status: 400 });
  const day = body.day || wibToday();
  const log = await prisma.sleepLog.upsert({
    where: { userId_day: { userId, day } },
    update: { bedMinute, wakeMinute, quality: body.quality ? Number(body.quality) : null },
    create: { userId, day, bedMinute, wakeMinute, quality: body.quality ? Number(body.quality) : null },
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