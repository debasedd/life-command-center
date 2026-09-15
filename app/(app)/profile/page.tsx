"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Card, Btn, Input, SectionTitle, toast, api } from "@/components/ui";
import { readCache, writeCache } from "@/lib/cache";

interface Me { id: string; email: string; name: string }
interface Settings { waterTargetMl: number; glassMl: number; workoutPerWeek: number; quietStartMinute: number; quietEndMinute: number }
interface Pref { type: string; enabled: boolean; minuteOfDay: number }

const PREF_LABEL: Record<string, string> = {
  TASK_DEADLINE: "Pengingat tugas & deadline",
  WATER_REMINDER: "Pengingat minum air",
  WORKOUT_REMINDER: "Pengingat olahraga",
  DAILY_RECAP: "Rekap harian malam",
  WEEKLY_EVAL: "Hasil evaluasi mingguan",
  MISSED_DEADLINE: "Peringatan tugas terlambat",
  MILESTONE: "Milestone tabungan",
};

function hhmm(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` }

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [waterTargetL, setWaterTargetL] = useState("2");
  const [glassMl, setGlassMl] = useState("250");
  const [workoutWeek, setWorkoutWeek] = useState("3");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api<Me>("/api/me"), api<{ settings: Settings }>("/api/settings"), api<{ prefs: Pref[] }>("/api/push/prefs")]).then(
      ([m, s, p]) => {
        writeCache("profileBundle", { me: m, settings: s.settings, prefs: p.prefs });
        setMe(m);
        setSettings(s.settings);
        setPrefs(p.prefs);
        setWaterTargetL(String(s.settings.waterTargetMl / 1000));
        setGlassMl(String(s.settings.glassMl));
        setWorkoutWeek(String(s.settings.workoutPerWeek));
      }
    );
  }, []);

  // Cache-first paint
  useLayoutEffect(() => {
    const c = readCache<{ me: Me; settings: Settings; prefs: Pref[] }>("profileBundle");
    if (c) {
      if (c.me) setMe(c.me);
      if (c.settings) {
        setSettings(c.settings);
        setWaterTargetL(String(c.settings.waterTargetMl / 1000));
        setGlassMl(String(c.settings.glassMl));
        setWorkoutWeek(String(c.settings.workoutPerWeek));
      }
      setPrefs(c.prefs ?? []);
    }
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
      toast("Pengaturan disimpan");
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

  return (
    <div className="animate-rise">
      <header className="mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">Profil</h1>
      </header>

      <Card className="mb-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#5e6ad2] flex items-center justify-center text-base font-medium text-white">
          {me?.name?.[0]?.toUpperCase() || "F"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#f7f8f8]">{me?.name || "…"}</div>
          <div className="text-[11px] text-[#62666d] truncate">{me?.email || ""}</div>
        </div>
      </Card>

      <SectionTitle>Menu</SectionTitle>
      <div className="space-y-1.5 mb-3">
        <a
          href="https://www.icloud.com/shortcuts/cb55e47c797843fe86d414d979982dfa"
          target="_blank"
          rel="noopener noreferrer"
          className="block card-press rounded-lg"
        >
          <Card className="!py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#f7f8f8]">Shortcut iOS — Share ke LifeCC</div>
              <div className="text-[11px] text-[#62666d]">Tap di iPhone untuk auto-install shortcut</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#62666d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </Card>
        </a>
        {([
          ["/advisor", "AI Financial Advisor", "Evaluasi kesehatan keuangan"],
          ["/whatif", "What-If Simulator", "Dampak pembelian ke target"],
          ["/invest", "Proyeksi Portofolio", "Compound growth jangka panjang"],
          ["/tasks", "Akademik & Jadwal", "Tugas, deadline, jadwal rutin"],
        ] as [string, string, string][]).map(([href, title, sub]) => (
          <Link key={href} href={href} className="block card-press rounded-lg">
            <Card className="!py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#f7f8f8]">{title}</div>
                <div className="text-[11px] text-[#62666d]">{sub}</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#62666d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Card>
          </Link>
        ))}
      </div>

      <SectionTitle>Target Harian</SectionTitle>
      <Card className="mb-3">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[#8a8f98] block mb-1">Air (L/hari)</label>
              <Input type="number" step="0.25" value={waterTargetL} onChange={(e) => setWaterTargetL(e.target.value)} className="!py-2 text-center tabular-nums" />
            </div>
            <div>
              <label className="text-[10px] text-[#8a8f98] block mb-1">Gelas (ml)</label>
              <Input type="number" value={glassMl} onChange={(e) => setGlassMl(e.target.value)} className="!py-2 text-center tabular-nums" />
            </div>
            <div>
              <label className="text-[10px] text-[#8a8f98] block mb-1">Olahraga/mgg</label>
              <Input type="number" value={workoutWeek} onChange={(e) => setWorkoutWeek(e.target.value)} className="!py-2 text-center tabular-nums" />
            </div>
          </div>
          <Btn onClick={saveSettings} disabled={busy} className="w-full !py-2 text-[13px]">{busy ? "…" : "Simpan"}</Btn>
        </div>
      </Card>

      <SectionTitle>Notifikasi</SectionTitle>
      <Card className="mb-3">
        <div className="space-y-1">
          {Object.entries(PREF_LABEL).map(([type, label]) => {
            const pref = prefs.find((p) => p.type === type);
            const enabled = pref?.enabled ?? false;
            return (
              <div key={type} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                <span className="text-[13px] text-[#d0d6e0]">{label}</span>
                <div className="flex items-center gap-2.5">
                  {enabled && ["WATER_REMINDER", "DAILY_RECAP", "WORKOUT_REMINDER"].includes(type) && (
                    <input
                      type="time"
                      value={hhmm(pref?.minuteOfDay ?? 420)}
                      onChange={(e) => changePrefTime(type, e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-[#d0d6e0] outline-none focus:border-[#7170ff] transition-colors duration-150"
                    />
                  )}
                  <button
                    onClick={() => togglePref(type, !enabled)}
                    role="switch"
                    aria-checked={enabled}
                    aria-label={label}
                    className={`w-10 h-[22px] rounded-full relative transition-colors duration-150 ${enabled ? "bg-[#27a644]" : "bg-white/[0.08]"}`}
                  >
                    <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-150 ${enabled ? "left-[22px]" : "left-[3px]"}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionTitle>Install ke Home Screen (iPhone)</SectionTitle>
      <Card className="mb-3 text-[13px] text-[#8a8f98] space-y-2 leading-relaxed">
        <p>1. Buka app ini di <b className="text-[#d0d6e0]">Safari</b></p>
        <p>2. Tap tombol <b className="text-[#d0d6e0]">Share</b> (kotak dengan panah ke atas)</p>
        <p>3. Scroll & tap <b className="text-[#d0d6e0]">Add to Home Screen</b></p>
        <p>4. Buka dari ikon di Home Screen — app jalan fullscreen + notifikasi aktif</p>
        <p className="text-[11px] text-[#4a4d52]">Catatan: Push notification iOS butuh PWA ter-install (iOS 16.4+).</p>
      </Card>

      <p className="text-center text-[10px] text-[#4a4d52] pb-4">Life Command Center v2.0</p>
    </div>
  );
}
