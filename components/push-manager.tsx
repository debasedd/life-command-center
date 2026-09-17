"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Send, BellRing } from "lucide-react";
import { api } from "@/components/ui";

/**
 * Web Push enablement — iOS ≥16.4: requires installed PWA + user gesture.
 * Flow: request permission → subscribe with VAPID → save → test push on demand.
 */
export default function PushManager() {
  const [supported, setSupported] = useState(true);
  const [standalone, setStandalone] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (!ok) return;
    if ("Notification" in window) {
      setPermission(Notification.permission);
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready
          .then((reg) => reg.pushManager.getSubscription())
          .then((sub) => setSubscribed(!!sub))
          .catch(() => {});
      }
    } else {
      setPermission("unsupported");
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMsg("Permission ditolak. Buka Settings iPhone, Safari (atau app LifeCC), Notifications.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapidRes = await api<{ publicKey: string | null }>("/api/push/vapid");
      if (!vapidRes.publicKey) {
        setMsg("Server belum punya VAPID key, notifikasi belum bisa dikirim.");
        return;
      }
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidRes.publicKey,
        }));
      await api("/api/push/subscribe", { json: sub.toJSON() });
      setSubscribed(true);
      setMsg("Notifikasi aktif. Kirim Test untuk memastikan sampai di iPhone.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi");
    } finally {
      setBusy(false);
    }
  }

  async function testPush() {
    setMsg("Notifikasi dikirim 5 detik lagi, tutup app sekarang.");
    try {
      await api("/api/push/test", { json: {} });
      setMsg("Test terkirim, cek notifikasi di iPhone.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal kirim");
    }
  }

  if (!supported) return null;

  if (subscribed) {
    return (
      <div className="surface !p-0 mb-3 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <CircleCheck size={17} strokeWidth={2} className="text-[color:var(--ui-positive)] shrink-0" aria-hidden />
            <span className="text-[13px] font-medium text-[color:var(--ui-text-soft)]">Notifikasi aktif di perangkat ini</span>
          </div>
          <button
            onClick={testPush}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--ui-text)] bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] rounded-control px-3 py-1.5 shadow-[var(--shadow-xs)] press transition-[box-shadow] duration-[180ms] hover:shadow-[var(--shadow-card)]"
          >
            <Send size={12} strokeWidth={2.25} aria-hidden /> Kirim test
          </button>
        </div>
        {msg && <p className="px-4 pb-3 -mt-1 text-[11px] text-[color:var(--ui-text-muted)]">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="surface !p-0 mb-3 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="w-9 h-9 rounded-[10px] bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] flex items-center justify-center text-[color:var(--ui-text-soft)] shrink-0">
          <BellRing size={16} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[color:var(--ui-text)]">Aktifkan pengingat</p>
          <p className="text-[11px] text-[color:var(--ui-text-muted)] mt-0.5 leading-relaxed">
            {standalone || permission !== "granted"
              ? "Tugas, minum air, olahraga & rekap harian langsung ke iPhone."
              : "Install app ke Home Screen dulu (Share, Add to Home Screen), lalu aktifkan dari sini."}
          </p>
        </div>
        <button
          onClick={enable}
          disabled={busy}
          className="shrink-0 bg-[color:var(--ui-primary)] hover:bg-[color:var(--ui-primary-hover)] text-[color:var(--ui-on-primary)] rounded-control px-3.5 py-2 text-xs font-semibold press transition-colors duration-[180ms] shadow-[var(--shadow-xs)] disabled:opacity-40"
        >
          {busy ? "…" : "Aktifkan"}
        </button>
      </div>
      {msg && <p className="px-4 pb-3 -mt-1 text-[11px] text-[color:var(--ui-text-muted)]">{msg}</p>}
    </div>
  );
}