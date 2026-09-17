"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Card, Btn, Input, SectionTitle, Row, toast, api } from "@/components/ui";
import PushManager from "@/components/push-manager";
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
      <header className="mb-5 pt-1">
        <p className="vr-kicker">Akun</p>
        <h1 className="vr-display mt-1">Profil</h1>
      </header>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-[color:var(--vr-primary)] flex items-center justify-center text-base font-medium text-white">
          {me?.name?.[0]?.toUpperCase() || "F"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-ink">{me?.name || "…"}</div>
          <div className="text-[11px] text-muted truncate">{me?.email || ""}</div>
        </div>
      </div>

      <SectionTitle>Notifikasi iPhone</SectionTitle>
      <PushManager />

      <SectionTitle>Menu</SectionTitle>
      <div className="mb-3">
        <a
          href="https://www.icloud.com/shortcuts/cb55e47c797843fe86d414d979982dfa"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Row>
            <div>
              <div className="text-sm font-medium text-ink">Shortcut iOS — Share ke LifeCC</div>
              <div className="text-[11px] text-muted">Tap di iPhone untuk auto-install shortcut</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--vr-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </Row>
        </a>
        {([
          ["/advisor", "AI Financial Advisor", "Evaluasi kesehatan keuangan"],
          ["/whatif", "What-If Simulator", "Dampak pembelian ke target"],
          ["/invest", "Proyeksi Portofolio", "Compound growth jangka panjang"],
          ["/tasks", "Akademik & Jadwal", "Tugas, deadline, jadwal rutin"],
        ] as [string, string, string][]).map(([href, title, sub]) => (
          <Link key={href} href={href} className="block">
            <Row>
              <div>
                <div className="text-sm font-medium text-ink">{title}</div>
                <div className="text-[11px] text-muted">{sub}</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--vr-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Row>
          </Link>
        ))}
      </div>

      <SectionTitle>Cara Share ke LifeCC</SectionTitle>
      <Card className="mb-3">
        <div className="space-y-4 text-[12px] text-soft leading-relaxed">
          <div>
            <p className="font-medium text-ink mb-1.5">Share teks (catatan / soal) — 2 action aja</p>
            <ol className="space-y-1.5 list-decimal pl-4">
              <li>Buka app <b className="text-ink">Shortcuts</b> → <b className="text-ink">+</b></li>
              <li>Tap <b className="text-ink">i</b> → aktifkan <b className="text-ink">Show in Share Sheet</b>, tipe: <b className="text-ink">Text</b></li>
              <li>Tambah action <b className="text-ink">Get Contents of URL</b> → URL: <code className="text-[10px] text-muted break-all">https://life-command-center-red.vercel.app/api/tasks/ai</code> → tap panah di card → <b className="text-ink">Method: POST</b> → <b className="text-ink">Request Body: Form</b> → Add New Field: nama <b className="text-ink">text</b>, isi: <b className="text-ink">Shortcut Input</b></li>
              <li>Nama: <b className="text-ink">Catat ke LifeCC</b></li>
            </ol>
          </div>
          <div className="pt-3 border-t border-lineSoft">
            <p className="font-medium text-ink mb-1.5">Share foto (struk / soal) — AI auto-mutu</p>
            <p className="text-[11px] text-muted mb-1.5">AI otomatis memutuskan: tugas (dikerjakan AI) atau catatan keuangan (nominal, masuk/keluar, kategori).</p>
            <ol className="space-y-1.5 list-decimal pl-4">
              <li>Buka app <b className="text-ink">Shortcuts</b> → <b className="text-ink">+</b></li>
              <li>Tap <b className="text-ink">i</b> → aktifkan <b className="text-ink">Show in Share Sheet</b>, tipe: <b className="text-ink">Images</b> & <b className="text-ink">Files</b></li>
              <li>Action 1: <b className="text-ink">Base64 Encode</b> → input: Shortcut Input</li>
              <li>Action 2: <b className="text-ink">Get Contents of URL</b> → URL: <code className="text-[10px] text-muted break-all">https://life-command-center-red.vercel.app/api/tasks/ai</code> → <b className="text-ink">Method: POST</b> → <b className="text-ink">Request Body: Form</b> → Add New Field: nama <b className="text-ink">photo</b>, isi: <b className="text-ink">Base64 Encoded</b></li>
              <li>Nama: <b className="text-ink">Foto ke LifeCC</b></li>
            </ol>
            <p className="text-[10px] text-muted mt-2">Hasil muncul di alert: catatan keuangan langsung tercatat, soal tugas dikerjakan AI. Hapus shortcut LifeCC2 lama yang pakai JSON — resep baru ini gak pake kutip-kutipan.</p>
          </div>
        </div>
      </Card>

      <SectionTitle>Target Harian</SectionTitle>
      <Card className="mb-3">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="vr-kicker block mb-1">Air (L/hari)</label>
              <Input type="number" step="0.25" value={waterTargetL} onChange={(e) => setWaterTargetL(e.target.value)} className="!py-2 text-center tabular-nums" />
            </div>
            <div>
              <label className="vr-kicker block mb-1">Gelas (ml)</label>
              <Input type="number" value={glassMl} onChange={(e) => setGlassMl(e.target.value)} className="!py-2 text-center tabular-nums" />
            </div>
            <div>
              <label className="vr-kicker block mb-1">Olahraga/mgg</label>
              <Input type="number" value={workoutWeek} onChange={(e) => setWorkoutWeek(e.target.value)} className="!py-2 text-center tabular-nums" />
            </div>
          </div>
          <Btn onClick={saveSettings} disabled={busy} className="w-full !py-2 text-[13px]">{busy ? "…" : "Simpan"}</Btn>
        </div>
      </Card>

      <SectionTitle>Notifikasi</SectionTitle>
      <div className="mb-3">
        {Object.entries(PREF_LABEL).map(([type, label]) => {
          const pref = prefs.find((p) => p.type === type);
          const enabled = pref?.enabled ?? false;
          return (
            <Row key={type}>
              <span className="text-[13px] text-soft">{label}</span>
              <div className="flex items-center gap-2.5">
                {enabled && ["WATER_REMINDER", "DAILY_RECAP", "WORKOUT_REMINDER"].includes(type) && (
                  <input
                    type="time"
                    value={hhmm(pref?.minuteOfDay ?? 420)}
                    onChange={(e) => changePrefTime(type, e.target.value)}
                    className="bg-white/[0.04] border border-lineSoft rounded-control px-2 py-1 text-[11px] text-soft outline-none focus:border-[color:var(--vr-accent)] transition-colors duration-[160ms]"
                  />
                )}
                <button
                  onClick={() => togglePref(type, !enabled)}
                  role="switch"
                  aria-checked={enabled}
                  aria-label={label}
                  className={`w-10 h-[22px] rounded-full relative transition-colors duration-[160ms] ${enabled ? "bg-[color:var(--vr-positive)]" : "bg-white/[0.08]"}`}
                >
                  <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-[160ms] ${enabled ? "left-[22px]" : "left-[3px]"}`} />
                </button>
              </div>
            </Row>
          );
        })}
      </div>

      <SectionTitle>Install ke Home Screen (iPhone)</SectionTitle>
      <Card className="mb-3 text-[13px] text-muted space-y-2 leading-relaxed">
        <p>1. Buka app ini di <b className="text-soft">Safari</b></p>
        <p>2. Tap tombol <b className="text-soft">Share</b> (kotak dengan panah ke atas)</p>
        <p>3. Scroll & tap <b className="text-soft">Add to Home Screen</b></p>
        <p>4. Buka dari ikon di Home Screen — app jalan fullscreen + notifikasi aktif</p>
        <p className="text-[11px] text-muted">Catatan: Push notification iOS butuh PWA ter-install (iOS 16.4+).</p>
      </Card>

      <p className="text-center text-[10px] text-muted pb-4">Life Command Center v2.0</p>
    </div>
  );
}
