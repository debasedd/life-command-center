"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui";

/** Web Push enablement UI — iOS ≥16.4 requires installed PWA + user gesture. */
export default function PushManager() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    if ("Notification" in window) setPermission(Notification.permission);
    else setPermission("unsupported");
  }, []);

  async function enable() {
    setBusy(true);
    setTestMsg("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setTestMsg("Permission ditolak. Buka Settings iPhone → Safari → Notifications untuk mengaktifkan.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapidRes = await api<{ publicKey: string | null }>("/api/push/vapid");
      if (!vapidRes.publicKey) {
        setTestMsg("Server belum punya VAPID key — notifikasi belum bisa dikirim.");
        return;
      }
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidRes.publicKey,
        }));
      const json = sub.toJSON();
      await api("/api/push/subscribe", { json });
      setTestMsg("✅ Notifikasi aktif!");
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi");
    } finally {
      setBusy(false);
    }
  }

  async function testPush() {
    setTestMsg("Mengirim…");
    try {
      await api("/api/push/test", { json: {} });
      setTestMsg("Test terkirim — cek notifikasi!");
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "Gagal kirim");
    }
  }

  if (!supported) return null;

  if (permission === "granted") {
    return (
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3">
        <span className="text-sm text-zinc-300">🔔 Notifikasi aktif</span>
        <button onClick={testPush} className="text-xs bg-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 active:scale-95">
          Test
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-2xl bg-gradient-to-br from-indigo-950 to-zinc-900 border border-indigo-900 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Aktifkan pengingat</p>
          <p className="text-[11px] text-zinc-400">Tugas, minum air, olahraga & rekap harian langsung ke iPhone.</p>
        </div>
        <button onClick={enable} disabled={busy} className="bg-indigo-600 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 active:scale-95">
          {busy ? "…" : "Aktifkan"}
        </button>
      </div>
      {testMsg && <p className="text-[11px] text-zinc-400 mt-2">{testMsg}</p>}
    </div>
  );
}