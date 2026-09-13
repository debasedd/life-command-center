import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/push/test — send a test push to the current user. Protected by session. */
export async function GET() {
  // Auth via cookie manually since route is under /api/push
  return NextResponse.json({ error: "use POST" }, { status: 405 });
}

export async function POST() {
  const { getAuthUserId } = await import("@/lib/auth");
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sendToUser } = await import("@/lib/push");
  const result = await sendToUser(userId, {
    title: "🔔 Test Notification",
    body: "Push notification Life Command Center berfungsi! 🎉",
    url: "/home",
  });
  if (result.sent === 0) {
    return NextResponse.json({ ok: false, error: "Tidak ada subscription terdaftar atau VAPID belum diset" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}