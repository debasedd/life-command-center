"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Card, Btn, Input, Select, toast, api } from "@/components/ui";
import PushManager from "@/components/push-manager";
import { readCache, writeCache } from "@/lib/cache";
import {
  Cpu, Bell, SlidersHorizontal, BookOpen, ChevronDown, ChevronRight, ArrowUpRight,
  UserRound, Compass, Target,
} from "lucide-react";

interface Me { id: string; email: string; name: string }
interface Settings { waterTargetMl: number; glassMl: number; workoutPerWeek: number; quietStartMinute: number; quietEndMinute: number; aiModel: string | null }
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

const MENU: [string, string, string][] = [
  ["/advisor", "AI Financial Advisor", "Evaluasi kesehatan keuangan"],
  ["/whatif", "What-If Simulator", "Dampak pembelian ke target"],
  ["/invest", "Proyeksi Portofolio", "Compound growth jangka panjang"],
  ["/tasks", "Akademik & Jadwal", "Tugas, deadline, jadwal rutin"],
];

function hhmm(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` }

/* Section header — icon + kicker, the page's one repeating rhythm. */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mt-7 mb-2 first:mt-0">
      <span className="text-[color:var(--ui-text-muted)]">{icon}</span>
      <h2 className="kicker">{label}</h2>
    </div>
  );
}

/* Setting row inside a grouped card. */
function SettingRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-[color:var(--ui-border)] last:border-b-0 ${className}`}>{children}</div>;
}

/* Collapsible guide — native details, chevron rotates, content fades in. */
function Guide({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-[color:var(--ui-border)] last:border-b-0">
      <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[color:var(--ui-text)]">{title}</div>
          <div className="text-[11px] text-[color:var(--ui-text-muted)] mt-0.5">{subtitle}</div>
        </div>
        <ChevronDown size={16} strokeWidth={2} className="shrink-0 text-[color:var(--ui-text-muted)] transition-transform duration-[220ms] ease-out group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 pb-4 fade-in">{children}</div>
    </details>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [waterTargetL, setWaterTargetL] = useState("2");
  const [glassMl, setGlassMl] = useState("250");
  const [workoutWeek, setWorkoutWeek] = useState("3");
  const [busy, setBusy] = useState(false);
  const [aiModel, setAiModel] = useState("");
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiModelSource, setAiModelSource] = useState<string>("");

  useEffect(() => {
    Promise.all([api<Me>("/api/me"), api<{ settings: Settings }>("/api/settings"), api<{ prefs: Pref[] }>("/api/push/prefs"), api<{ models: string[]; default: string; source: string }>("/api/ai/models")]).then(
      ([m, s, p, am]) => {
        writeCache("profileBundle", { me: m, settings: s.settings, prefs: p.prefs });
        setMe(m);
        setSettings(s.settings);
        setPrefs(p.prefs);
        setWaterTargetL(String(s.settings.waterTargetMl / 1000));
        setGlassMl(String(s.settings.glassMl));
        setWorkoutWeek(String(s.settings.workoutPerWeek));
        setAiModel(s.settings.aiModel ?? "");
        setAiModels(am.models ?? []);
        setAiModelSource(am.source ?? "");
      }
    );
  }, []);

  async function saveAiModel() {
    try {
      const res = await api<{ settings: Settings }>("/api/settings", { method: "PATCH", json: { aiModel } });
      setSettings(res.settings);
      toast(aiModel ? "Model AI disimpan" : "Kembali ke model default");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", "err");
    }
  }

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
    <div className="fade-rise">
      <header className="mb-5 pt-1">
        <p className="kicker">Akun</p>
        <h1 className="display mt-1">Profil</h1>
      </header>

      {/* --- Akun --- */}
      <Card className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-[color:var(--ui-primary)] flex items-center justify-center text-[17px] font-semibold text-white shrink-0">
          {me?.name?.[0]?.toUpperCase() || "F"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[color:var(--ui-text)] truncate">{me?.name || "…"}</div>
          <div className="text-xs text-[color:var(--ui-text-muted)] truncate mt-0.5">{me?.email || ""}</div>
        </div>
        <UserRound size={18} strokeWidth={1.75} className="text-[color:var(--ui-text-muted)] shrink-0" aria-hidden />
      </Card>

      {/* --- Menu --- */}
      <SectionHeader icon={<Compass size={13} strokeWidth={2} />} label="Menu" />
      <Card className="!p-0 overflow-hidden">
        <a href="https://www.icloud.com/shortcuts/cb55e47c797843fe86d414d979982dfa" target="_blank" rel="noopener noreferrer" className="block">
          <SettingRow>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[color:var(--ui-text)]">Shortcut iOS — Share ke LifeCC</div>
              <div className="text-[11px] text-[color:var(--ui-text-muted)] mt-0.5">Tap di iPhone untuk auto-install shortcut</div>
            </div>
            <ArrowUpRight size={16} strokeWidth={2} className="shrink-0 text-[color:var(--ui-text-muted)]" aria-hidden />
          </SettingRow>
        </a>
        {MENU.map(([href, title, sub]) => (
          <Link key={href} href={href} className="block">
            <SettingRow>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[color:var(--ui-text)]">{title}</div>
                <div className="text-[11px] text-[color:var(--ui-text-muted)] mt-0.5">{sub}</div>
              </div>
              <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[color:var(--ui-text-muted)]" aria-hidden />
            </SettingRow>
          </Link>
        ))}
      </Card>

      {/* --- Notifikasi --- */}
      <SectionHeader icon={<Bell size={13} strokeWidth={2} />} label="Notifikasi" />
      <PushManager />
      <Card className="!p-0 overflow-hidden">
        {Object.entries(PREF_LABEL).map(([type, label]) => {
          const pref = prefs.find((p) => p.type === type);
          const enabled = pref?.enabled ?? false;
          return (
            <SettingRow key={type}>
              <span className="text-[13px] text-[color:var(--ui-text-soft)]">{label}</span>
              <div className="flex items-center gap-2.5">
                {enabled && ["WATER_REMINDER", "DAILY_RECAP", "WORKOUT_REMINDER"].includes(type) && (
                  <input
                    type="time"
                    value={hhmm(pref?.minuteOfDay ?? 420)}
                    onChange={(e) => changePrefTime(type, e.target.value)}
                    className="bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] rounded-control px-2 py-1 text-[11px] text-[color:var(--ui-text-soft)] outline-none focus:border-[color:var(--ui-focus-ring)] transition-colors duration-[180ms] num"
                  />
                )}
                <button
                  onClick={() => togglePref(type, !enabled)}
                  role="switch"
                  aria-checked={enabled}
                  aria-label={label}
                  className={`w-10 h-[22px] rounded-full relative transition-colors duration-[180ms] ${enabled ? "bg-[color:var(--ui-positive)]" : "bg-black/[0.08]"}`}
                >
                  <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-[var(--shadow-xs)] transition-all duration-[180ms] ${enabled ? "left-[22px]" : "left-[3px]"}`} />
                </button>
              </div>
            </SettingRow>
          );
        })}
      </Card>

      {/* --- Pengaturan --- */}
      <SectionHeader icon={<SlidersHorizontal size={13} strokeWidth={2} />} label="Pengaturan" />

      <Card className="mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} strokeWidth={2} className="text-[color:var(--ui-text-muted)]" aria-hidden />
          <span className="text-[13px] font-semibold text-[color:var(--ui-text)]">Target Harian</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="kicker block mb-1">Air (L)</label>
            <Input type="number" step="0.25" value={waterTargetL} onChange={(e) => setWaterTargetL(e.target.value)} className="!py-2 text-center num" />
          </div>
          <div>
            <label className="kicker block mb-1">Gelas (ml)</label>
            <Input type="number" value={glassMl} onChange={(e) => setGlassMl(e.target.value)} className="!py-2 text-center num" />
          </div>
          <div>
            <label className="kicker block mb-1">Olahraga/mgg</label>
            <Input type="number" value={workoutWeek} onChange={(e) => setWorkoutWeek(e.target.value)} className="!py-2 text-center num" />
          </div>
        </div>
        <Btn variant="ghost" onClick={saveSettings} disabled={busy} className="w-full mt-3 !py-2 text-[13px]">{busy ? "Menyimpan…" : "Simpan Target"}</Btn>
      </Card>

      <Card className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={14} strokeWidth={2} className="text-[color:var(--ui-text-muted)]" aria-hidden />
          <span className="text-[13px] font-semibold text-[color:var(--ui-text)]">Model AI</span>
        </div>
        <p className="text-[11px] text-[color:var(--ui-text-muted)] leading-relaxed mb-3">
          Dipakai untuk mengerjakan soal & membaca foto struk.
          {aiModelSource === "provider" ? ` ${aiModels.length} model tersedia dari provider.` : " Daftar fallback (provider offline)."}
        </p>
        <Select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
          <option value="">Default server (z-ai/glm-5.3-flash)</option>
          {aiModels
            .filter((m) => m !== "openrouter/z-ai/glm-5.3-flash")
            .map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
        </Select>
        <Btn variant="ghost" onClick={saveAiModel} className="w-full mt-3 !py-2 text-[13px]">Simpan Model</Btn>
      </Card>

      {/* --- Panduan --- */}
      <SectionHeader icon={<BookOpen size={13} strokeWidth={2} />} label="Panduan" />
      <Card className="!p-0 overflow-hidden mb-4">
        <Guide title="Share teks & soal" subtitle="2 action — Catat ke LifeCC">
          <ol className="space-y-1.5 text-[12px] text-[color:var(--ui-text-soft)] leading-relaxed list-decimal pl-4">
            <li>Buka app <b className="text-[color:var(--ui-text)]">Shortcuts</b>, tap <b className="text-[color:var(--ui-text)]">+</b></li>
            <li>Tap <b className="text-[color:var(--ui-text)]">i</b>, aktifkan <b className="text-[color:var(--ui-text)]">Show in Share Sheet</b>, tipe <b className="text-[color:var(--ui-text)]">Text</b></li>
            <li>Action <b className="text-[color:var(--ui-text)]">Get Contents of URL</b>, URL di bawah, <b className="text-[color:var(--ui-text)]">Method: POST</b>, <b className="text-[color:var(--ui-text)]">Request Body: Form</b>, field <b className="text-[color:var(--ui-text)]">text</b> isi <b className="text-[color:var(--ui-text)]">Shortcut Input</b></li>
          </ol>
          <code className="block mt-2.5 text-[10.5px] text-[color:var(--ui-text-muted)] bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] rounded-control px-2.5 py-2 break-all">
            https://life-command-center-red.vercel.app/api/tasks/ai
          </code>
        </Guide>
        <Guide title="Share foto (struk / soal)" subtitle="AI auto-mutu: keuangan atau dikerjakan">
          <ol className="space-y-1.5 text-[12px] text-[color:var(--ui-text-soft)] leading-relaxed list-decimal pl-4">
            <li>Shortcuts → <b className="text-[color:var(--ui-text)]">i</b> → <b className="text-[color:var(--ui-text)]">Show in Share Sheet</b>, tipe <b className="text-[color:var(--ui-text)]">Images</b> & <b className="text-[color:var(--ui-text)]">Files</b></li>
            <li>Action 1: <b className="text-[color:var(--ui-text)]">Base64 Encode</b> — input Shortcut Input</li>
            <li>Action 2: <b className="text-[color:var(--ui-text)]">Get Contents of URL</b> (URL sama), <b className="text-[color:var(--ui-text)]">Method: POST</b>, <b className="text-[color:var(--ui-text)]">Request Body: Form</b>, field <b className="text-[color:var(--ui-text)]">photo</b> isi <b className="text-[color:var(--ui-text)]">Base64 Encoded</b></li>
          </ol>
          <p className="text-[10.5px] text-[color:var(--ui-text-muted)] mt-2.5 leading-relaxed">
            Struk & transfer langsung tercatat di Keuangan; soal tugas dikerjakan AI. Hapus shortcut lama yang memakai JSON.
          </p>
        </Guide>
        <Guide title="Install ke Home Screen" subtitle="Fullscreen + notifikasi aktif">
          <ol className="space-y-1.5 text-[12px] text-[color:var(--ui-text-soft)] leading-relaxed list-decimal pl-4">
            <li>Buka app ini di <b className="text-[color:var(--ui-text)]">Safari</b></li>
            <li>Tap tombol <b className="text-[color:var(--ui-text)]">Share</b></li>
            <li>Scroll, tap <b className="text-[color:var(--ui-text)]">Add to Home Screen</b></li>
            <li>Buka dari ikon di Home Screen</li>
          </ol>
          <p className="text-[10.5px] text-[color:var(--ui-text-muted)] mt-2.5">Push notification iOS butuh PWA ter-install (iOS 16.4+).</p>
        </Guide>
      </Card>

      <div className="flex items-center gap-2 justify-center pb-4">
        <p className="text-[10px] tracking-[0.08em] uppercase text-[color:var(--ui-text-muted)]">Life Command Center · v2.0</p>
      </div>
    </div>
  );
}
