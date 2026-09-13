import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** GET /api/push/vapid — expose public key to client. */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

/** POST /api/push/subscribe — save subscription {endpoint, keys:{p256dh,auth}}. */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth)
    return NextResponse.json({ error: "Subscription tidak valid" }, { status: 400 });
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe?endpoint= */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  return NextResponse.json({ ok: true });
}