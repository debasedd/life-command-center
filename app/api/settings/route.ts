import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** GET /api/settings */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings) settings = await prisma.settings.create({ data: { userId } });
  return NextResponse.json({ settings });
}

/** PATCH /api/settings */
export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const k of ["waterTargetMl", "glassMl", "workoutPerWeek"]) {
    if (body[k] !== undefined) data[k] = Math.max(0, Number(body[k]));
  }
  if (body.quietStartMinute !== undefined) data.quietStartMinute = Number(body.quietStartMinute);
  if (body.quietEndMinute !== undefined) data.quietEndMinute = Number(body.quietEndMinute);
  if (body.aiModel !== undefined) {
    const m = String(body.aiModel).trim().slice(0, 120);
    data.aiModel = m || null;
  }
  const settings = await prisma.settings.upsert({ where: { userId }, update: data, create: { userId } });
  return NextResponse.json({ settings });
}