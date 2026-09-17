"use client";

import { useEffect, useState } from "react";
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
        setMsg("Permission ditolak. Buka Settings iPhone → Safari (atau app LifeCC) → Notifications.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapidRes = await api<{ publicKey: string | null }>("/api/push/vapid");
      if (!vapidRes.publicKey) {
        setMsg("Server belum punya VAPID key — notifikasi belum bisa dikirim.");
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
    setMsg("Notifikasi dikirim 5 detik lagi — tutup app sekarang.");
    try {
      await api("/api/push/test", { json: {} });
      setMsg("Test terkirim — cek notifikasi di iPhone.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal kirim");
    }
  }

  if (!supported) return null;

  if (subscribed) {
    return (
      <div className="mb-3 flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.08] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#609f89]" />
          <span className="text-[13px] text-[#c4c4ca]">Notifikasi aktif</span>
        </div>
        <button onClick={testPush} className="text-xs text-[#531aff] border border-[#531aff]/30 rounded-md px-3 py-1.5 font-medium transition-colors duration-150 hover:bg-[#531aff]/10">
          Kirim test
        </button>
        {msg && <p className="sr-only">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-lg bg-white/[0.02] border border-white/[0.08] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#ffffff]">Aktifkan pengingat</p>
          <p className="text-[11px] text-[#868593] mt-0.5 leading-relaxed">
            {standalone || permission !== "granted"
              ? "Tugas, minum air, olahraga & rekap harian langsung ke iPhone."
              : "Install app ke Home Screen dulu (Share → Add to Home Screen), lalu aktifkan dari sini."}
          </p>
        </div>
        <button onClick={enable} disabled={busy} className="shrink-0 bg-[#553f83] hover:bg-[#531aff] text-white rounded-md px-3.5 py-2 text-xs font-medium transition-colors duration-150 disabled:opacity-40">
          {busy ? "…" : "Aktifkan"}
        </button>
      </div>
      {msg && <p className="text-[11px] text-[#868593] mt-2">{msg}</p>}
    </div>
  );
}
