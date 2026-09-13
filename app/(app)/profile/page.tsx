"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Btn, Input, SectionTitle, toast, api } from "@/components/ui";

interface Me { id: string; email: string; name: string }
interface Settings { waterTargetMl: number; glassMl: number; workoutPerWeek: number; quietStartMinute: number; quietEndMinute: number }
interface Pref { type: string; enabled: boolean; minuteOfDay: number }

const PREF_LABEL: Record<string, string> = {
  TASK_DEADLINE: "⏰ Pengingat tugas & deadline",
  WATER_REMINDER: "💧 Pengingat minum air",
  WORKOUT_REMINDER: "💪 Pengingat olahraga",
  DAILY_RECAP: "🌙 Rekap harian malam",
  WEEKLY_EVAL: "📊 Hasil evaluasi mingguan",
  MISSED_DEADLINE: "⚠️ Peringatan tugas terlambat",
  MILESTONE: "🎉 Milestone tabungan",
};

function hhmm(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` }

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [waterTargetL, setWaterTargetL] = useState("2");
  const [glassMl, setGlassMl] = useState("250");
  const [workoutWeek, setWorkoutWeek] = useState("3");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api<{ } & Me>("/api/me"), api<{ settings: Settings }>("/api/settings"), api<{ prefs: Pref[] }>("/api/push/prefs")]).then(
      ([m, s, p]) => {
        setMe(m as Me);
        setSettings(s.settings);
        setPrefs(p.prefs);
        setWaterTargetL(String(s.settings.waterTargetMl / 1000));
        setGlassMl(String(s.settings.glassMl));
        setWorkoutWeek(String(s.settings.workoutPerWeek));
      }
    );
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    try {
      const res = await api<{ settings: Settings }>("/api/settings", {
        method: "PATCH",
        json: { waterTargetMl: Math.round(Number(waterTargetL) * 1000) || 2000, glassMl: Number(glassMl) || 250, workoutPerWeek: Number(workoutWeek) || 3 },
      });
      setSettings(res.settings);
      toast("Pengaturan disimpan ✅");
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function togglePref(type: string, enabled: boolean) {
    const res = await api<{ pref: Pref }>("/api/push/prefs", { method: "PATCH", json: { type, enabled } });
    setPrefs((prev) => prev.map((p) => (p.type === type ? res.pref : p)).concat(prev.some((p) => p.type === type) ? [] : [res.pref]));
  }

  async function changePrefTime(type: string, time: string) {
    const [h, m] = time.split(":").map(Number);
    const minuteOfDay = h * 60 + m;
    const res = await api<{ pref: Pref }>("/api/push/prefs", { method: "PATCH", json: { type, minuteOfDay } });
    setPrefs((prev) => prev.map((p) => (p.type === type ? res.pref : p)).concat(prev.some((p) => p.type === type) ? [] : [res.pref]));
  }

  async function logout() {
    await api("/api/auth/logout", { json: {} });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="animate-rise">
      <h1 className="text-xl font-bold mb-4">⚙️ Profil</h1>

      <Card className="mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold">{me?.name?.[0]?.toUpperCase() || "?"}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{me?.name}</div>
          <div className="text-xs text-zinc-500 truncate">{me?.email}</div>
        </div>
        <Btn variant="ghost" onClick={logout} className="text-xs">Keluar</Btn>
      </Card>

      <SectionTitle>Link Cepat</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          ["/advisor", "🤖 AI Advisor"],
          ["/whatif", "🔮 What-If Simulator"],
          ["/invest", "📈 Proyeksi Investasi"],
          ["/tasks", "📚 Akademik"],
        ].map(([href, label]) => (
          <a key={href} href={href}>
            <Card className="!py-3 text-center text-sm font-semibold active:scale-[0.98] transition">{label}</Card>
          </a>
        ))}
      </div>

      <SectionTitle>Target Harian</SectionTitle>
      <Card className="mb-4">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Air (L/hari)</label>
              <Input type="number" step="0.25" value={waterTargetL} onChange={(e) => setWaterTargetL(e.target.value)} className="!py-2 text-center" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Gelas (ml)</label>
              <Input type="number" value={glassMl} onChange={(e) => setGlassMl(e.target.value)} className="!py-2 text-center" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Olahraga/mgg</label>
              <Input type="number" value={workoutWeek} onChange={(e) => setWorkoutWeek(e.target.value)} className="!py-2 text-center" />
            </div>
          </div>
          <Btn onClick={saveSettings} disabled={busy} className="w-full text-sm">{busy ? "…" : "Simpan"}</Btn>
        </div>
      </Card>

      <SectionTitle>Notifikasi</SectionTitle>
      <Card className="mb-4">
        <div className="space-y-2">
          {Object.entries(PREF_LABEL).map(([type, label]) => {
            const pref = prefs.find((p) => p.type === type);
            return (
              <div key={type} className="flex items-center justify-between py-1.5">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  {pref?.enabled && ["WATER_REMINDER", "DAILY_RECAP", "WORKOUT_REMINDER"].includes(type) && (
                    <input
                      type="time"
                      value={hhmm(pref.minuteOfDay)}
                      onChange={(e) => changePrefTime(type, e.target.value)}
                      className="bg-zinc-800 rounded-lg px-2 py-1 text-xs"
                    />
                  )}
                  <button
                    onClick={() => togglePref(type, !pref?.enabled)}
                    className={`w-11 h-6 rounded-full relative transition ${pref?.enabled ? "bg-emerald-600" : "bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${pref?.enabled ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionTitle>Install ke Home Screen (iPhone)</SectionTitle>
      <Card className="mb-4 text-sm text-zinc-300 space-y-2">
        <p>1. Buka app ini di <b>Safari</b></p>
        <p>2. Tap tombol <b>Share</b> (kotak dengan panah ke atas)</p>
        <p>3. Scroll & tap <b>Add to Home Screen</b></p>
        <p>4. Buka dari ikon di Home Screen → app jalan fullscreen + notifikasi aktif</p>
        <p className="text-[11px] text-zinc-500">Catatan: Push notification iOS butuh PWA ter-install (iOS 16.4+).</p>
      </Card>

      <p className="text-center text-[10px] text-zinc-600 pb-4">Life Command Center v1.0</p>
    </div>
  );
}