import { NextResponse } from "next/server";

// Long enough for the 5s delay + web-push roundtrip, so the user can close the app first.
export const maxDuration = 30;

/** GET /api/push/test — send a test push to the current user. Protected by session. */
export async function GET() {
  return NextResponse.json({ error: "use POST" }, { status: 405 });
}

export async function POST() {
  const { getAuthUserId } = await import("@/lib/auth");
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sendToUser } = await import("@/lib/push");

  // Give the user time to close the app before the notification lands.
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const result = await sendToUser(userId, {
    title: "Test Notification",
    body: "Push notification Life Command Center berfungsi!",
    url: "/home",
  });
  if (result.sent === 0) {
    return NextResponse.json({ ok: false, error: "Tidak ada subscription terdaftar atau VAPID belum diset" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}
