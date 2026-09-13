import { NextResponse } from "next/server";

/** GET /api/push/vapid — expose public VAPID key to client. */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}