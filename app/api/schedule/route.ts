import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** GET /api/schedule — all blocks for user. */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocks = await prisma.scheduleBlock.findMany({ where: { userId }, orderBy: [{ startMinute: "asc" }] });
  return NextResponse.json({ blocks });
}

/** POST /api/schedule — create block. */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { title, type, startTime, endTime, weekday, date, location } = body;
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Judul wajib" }, { status: 400 });
  const startMinute = toMinute(startTime);
  const endMinute = toMinute(endTime);
  if (startMinute == null || endMinute == null || endMinute <= startMinute)
    return NextResponse.json({ error: "Jam tidak valid (akhir harus > awal)" }, { status: 400 });
  const block = await prisma.scheduleBlock.create({
    data: {
      userId,
      title: String(title).trim(),
      type: type || "SCHOOL",
      startMinute,
      endMinute,
      weekday: weekday === null || weekday === undefined || weekday === "" ? null : Number(weekday),
      date: date || null,
      location: location ? String(location) : null,
    },
  });
  return NextResponse.json({ block });
}

/** PATCH /api/schedule */
export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const existing = await prisma.scheduleBlock.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title);
  if (body.type !== undefined) data.type = body.type;
  if (body.startTime !== undefined) data.startMinute = toMinute(body.startTime);
  if (body.endTime !== undefined) data.endMinute = toMinute(body.endTime);
  if (body.weekday !== undefined) data.weekday = body.weekday === "" || body.weekday === null ? null : Number(body.weekday);
  if (body.date !== undefined) data.date = body.date || null;
  if (body.location !== undefined) data.location = body.location || null;
  const block = await prisma.scheduleBlock.update({ where: { id: body.id }, data });
  return NextResponse.json({ block });
}

/** DELETE /api/schedule?id= */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await prisma.scheduleBlock.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

function toMinute(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}