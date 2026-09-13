import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const prefs = await prisma.notificationPref.findMany({ where: { userId } });
  return NextResponse.json({ prefs });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { type, enabled, minuteOfDay } = body;
  if (!type) return NextResponse.json({ error: "type wajib" }, { status: 400 });
  const pref = await prisma.notificationPref.upsert({
    where: { userId_type: { userId, type } },
    update: { ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}), ...(minuteOfDay !== undefined ? { minuteOfDay: Number(minuteOfDay) } : {}) },
    create: { userId, type, enabled: enabled !== false, minuteOfDay: minuteOfDay ?? 540 },
  });
  return NextResponse.json({ pref });
}