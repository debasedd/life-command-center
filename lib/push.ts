/** Web Push sender — wraps `web-push` with graceful no-op when VAPID keys absent.
 *  iOS (Apple push endpoint) quirks handled here:
 *  - VAPID subject must be a real reachable mailto (Apple rejects .local domains)
 *  - payload sent flat (SW reads {title,body,url}) AND nested {notification:{...}}
 *  - TTL + Urgency headers required/expected by Apple push service
 *  - expired Apple endpoints return 403 (not 410) → prune on both */
import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:fatihaidil01@gmail.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export async function sendToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }): Promise<{ sent: number; failed: number }> {
  ensureConfigured();
  if (!isPushConfigured()) return { sent: 0, failed: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        const flat = JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || "/",
          tag: payload.tag,
          notification: { title: payload.title, body: payload.body },
        });
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          flat,
          { TTL: 24 * 3600, headers: { Urgency: "normal" } }
        );
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        // Apple returns 403 for expired endpoints instead of 410 — prune both.
        if (status === 403 || status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
        }
        console.error(`[push] send failed (${status}):`, (err as Error).message?.slice(0, 200));
      }
    })
  );
  return { sent, failed };
}
