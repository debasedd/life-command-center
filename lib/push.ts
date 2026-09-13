/** Web Push sender — wraps `web-push` with graceful no-op when VAPID keys absent. */
import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@lifecommand.local",
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
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || "/", tag: payload.tag })
        );
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired — remove
          await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
        }
      }
    })
  );
  return { sent, failed };
}