"use client";

import { useEffect, useLayoutEffect, useState, useMemo } from "react";
import { Card, Btn, Input, Select, Sheet, SectionTitle, ProgressRing, toast, api } from "@/components/ui";
import { wibToday } from "@/lib/wib";
import { readCache, writeCache } from "@/lib/cache";

interface Workout { id: string; type: string; durationMinutes: number; intensity: string; day: string }
interface Habit { id: string; name: string; icon: string; targetPerWeek: number }
interface SleepLog { id: string; day: string; bedMinute: number; wakeMinute: number; quality: number | null }
interface HabitsRes { habits: Habit[]; checkins: { habitId: string; day: string }[]; streaks: Record<string, { current: number; best: number }>; weeklyCount: Record<string, number> }

const WORKOUT_TYPES = ["Jogging", "Lari", "Push-up & Sit-up", "Gym / Angkat Beban", "Sepeda", "Futsal", "Basket", "Renang", "Yoga", "Jalan Kaki"];

function Trash({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 text-[#868593] hover:text-[#f87171] transition-colors duration-150" aria-label="Hapus">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
    </button>
  );
}

export default function HealthPage() {
  const [tab, setTab] = useState<"workout" | "water" | "sleep" | "habits">("workout");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [wStats, setWStats] = useState({ thisWeekCount: 0, lastWeekCount: 0, thisWeekMinutes: 0, streak: 0, daysWith: [] as string[] });
  const [water, setWater] = useState({ todayMl: 0, target: 2000, glassMl: 250, history: [] as { day: string; ml: number; hit: boolean }[] });
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [hData, setHData] = useState<HabitsRes | null>(null);
  const [sheet, setSheet] = useState<"workout" | "sleep" | "habit" | null>(null);
  const [busy, setBusy] = useState(false);

  // workout form
  const [wType, setWType] = useState(WORKOUT_TYPES[0]);
  const [wDur, setWDur] = useState(30);
  const [wInt, setWInt] = useState("SEDANG");
  const [wDay, setWDay] = useState("");

  // sleep form
  const [sBed, setSBed] = useState("22:30");
  const [sWake, setSWake] = useState("05:30");
  const [sQuality, setSQuality] = useState(4);
  const [sDay, setSDay] = useState("");

  // habit form
  const [hName, setHName] = useState("");
  const [hIcon, setHIcon] = useState("✅");
  const [hTarget, setHTarget] = useState(7);

  async function load() {
    const [w, wa, s, h] = await Promise.all([
      api<{ workouts: Workout[]; stats: typeof wStats }>("/api/workouts?days=35"),
      api<{ todayMl: number; target: number; glassMl: number; history: { day: string; ml: number; hit: boolean }[] }>("/api/water?days=7"),
      api<{ logs: SleepLog[] }>("/api/sleep?days=14"),
      api<HabitsRes>("/api/habits"),
    ]);
    writeCache("health", { workouts: w.workouts, stats: w.stats, water: wa, sleep: s.logs, habits: h });
    setWorkouts(w.workouts);
    setWStats(w.stats);
    setWater(wa);
    setSleepLogs(s.logs);
    setHData(h);
  }
  // Cache-first paint
  useLayoutEffect(() => {
    const c = readCache<{ workouts: Workout[]; stats: typeof wStats; water: typeof water; sleep: SleepLog[]; habits: HabitsRes }>("health");
    if (c) {
      setWorkouts(c.workouts ?? []);
      if (c.stats) setWStats(c.stats);
      if (c.water) setWater(c.water);
      setSleepLogs(c.sleep ?? []);
      if (c.habits) setHData(c.habits);
    }
  }, []);
  useEffect(() => { load() }, []);

  async function addWorkout() {
    setBusy(true);
    try {
      await api("/api/workouts", { json: { type: wType, durationMinutes: wDur, intensity: wInt, day: wDay || undefined } });
      toast("Workout dicatat");
      setSheet(null); setWDay("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function quickWater(glasses: number) {
    await api("/api/water", { json: { glasses } });
    await load();
  }

  async function undoWater() {
    await api("/api/water", { method: "DELETE" });
    await load();
  }

  async function saveSleep() {
    setBusy(true);
    try {
      await api("/api/sleep", { json: { bedTime: sBed, wakeTime: sWake, quality: sQuality, day: sDay || undefined } });
      toast("Tidur dicatat");
      setSheet(null); setSDay("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function addHabit() {
    if (!hName.trim()) return toast("Nama habit wajib diisi", "err");
    setBusy(true);
    try {
      await api("/api/habits", { json: { name: hName, icon: hIcon, targetPerWeek: hTarget } });
      toast("Habit dibuat");
      setSheet(null); setHName("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function toggleHabit(id: string) {
    await api("/api/habits", { method: "PATCH", json: { id } });
    await load();
  }

  async function delHabit(id: string) {
    await api(`/api/habits?id=${id}`, { method: "DELETE" });
    toast("Habit diarsipkan");
    await load();
  }

  const today = wibToday();

  const heat = useMemo(() => {
    const days: { day: string; has: boolean; minutes: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const w = workouts.filter((x) => x.day === ds);
      days.push({ day: ds, has: w.length > 0, minutes: w.reduce((s, x) => s + x.durationMinutes, 0) });
    }
    return days;
  }, [workouts, today]);

  const waterPct = water.target > 0 ? water.todayMl / water.target : 0;
  const glasses = Math.round(water.target / water.glassMl);
  const todayGlasses = Math.round(water.todayMl / water.glassMl);

  const TAB_LABEL = { workout: "Olahraga", water: "Air", sleep: "Tidur", habits: "Habit" } as const;

  return (
    <div className="animate-rise">
      <header className="flex items-center justify-between mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#ffffff]">Kesehatan</h1>
        <Btn
          onClick={() => setSheet(tab === "workout" ? "workout" : tab === "sleep" ? "sleep" : tab === "habits" ? "habit" : null)}
          className="!py-1.5 !px-3 text-xs"
          disabled={tab === "water"}
        >
          {`Tambah ${TAB_LABEL[tab]}`}
        </Btn>
      </header>

      {/* Segmented control */}
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-1 mb-4">
        {(["workout", "water", "sleep", "habits"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md py-1.5 text-[11px] font-medium transition-colors duration-150 ${tab === t ? "bg-white/[0.08] text-[#ffffff]" : "text-[#868593]"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "workout" && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Card className="text-center !py-3">
              <div className="text-xl font-semibold text-[#ffffff] tabular-nums">{wStats.thisWeekCount}</div>
              <p className="text-[10px] text-[#868593]">sesi minggu ini</p>
            </Card>
            <Card className="text-center !py-3">
              <div className="text-xl font-semibold text-[#ffffff] tabular-nums">{wStats.thisWeekMinutes}</div>
              <p className="text-[10px] text-[#868593]">menit minggu ini</p>
            </Card>
            <Card className="text-center !py-3">
              <div className="text-xl font-semibold text-[#eab38a] tabular-nums">{wStats.streak}</div>
              <p className="text-[10px] text-[#868593]">hari beruntun</p>
            </Card>
          </div>

          <Card className="mb-3">
            <p className="text-[10px] text-[#868593] mb-2">Konsistensi 4 minggu</p>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
              {heat.map((h) => (
                <div
                  key={h.day}
                  title={`${h.day}: ${h.minutes} menit`}
                  className="aspect-square rounded-[3px] transition-colors duration-300"
                  style={{ background: h.has ? (h.minutes >= 45 ? "#609f89" : h.minutes >= 25 ? "#72b39a" : "#2c4a40") : "rgba(255,255,255,0.05)" }}
                />
              ))}
            </div>
          </Card>

          <SectionTitle>Riwayat</SectionTitle>
          {workouts.slice(0, 15).map((w) => (
            <Card key={w.id} className="!py-2.5 mb-1.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#ffffff]">{w.type}</div>
                <div className="text-[11px] text-[#868593]">{w.day} · {w.durationMinutes} mnt · {w.intensity.toLowerCase()}</div>
              </div>
              <Trash onClick={async () => { await api(`/api/workouts?id=${w.id}`, { method: "DELETE" }); await load(); }} />
            </Card>
          ))}
          {workouts.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-[#868593]">Belum ada workout</p>
            </div>
          )}
        </>
      )}

      {tab === "water" && (
        <>
          <Card className="text-center py-7 mb-3">
            <div className="flex justify-center">
              <ProgressRing value={waterPct} size={140} stroke={10} color="#531aff">
                <div>
                  <div className="text-2xl font-semibold text-[#ffffff] tabular-nums">{(water.todayMl / 1000).toFixed(2)}L</div>
                  <div className="text-[11px] text-[#868593]">dari {(water.target / 1000).toFixed(1)}L</div>
                </div>
              </ProgressRing>
            </div>
            <div className="flex justify-center gap-1 mt-4">
              {Array.from({ length: glasses }).map((_, i) => (
                <span key={i} className={`w-2 h-4 rounded-[2px] ${i < todayGlasses ? "bg-[#531aff]" : "bg-white/[0.08]"}`} />
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-5">
              <Btn onClick={() => quickWater(1)} className="px-8">+1 Gelas</Btn>
              <Btn variant="ghost" onClick={() => quickWater(2)}>+2</Btn>
              <Btn variant="ghost" onClick={undoWater} className="text-xs">Undo</Btn>
            </div>
          </Card>

          <SectionTitle>7 Hari Terakhir</SectionTitle>
          {water.history.slice().reverse().map((h) => (
            <Card key={h.day} className="!py-2.5 mb-1.5 flex items-center justify-between">
              <span className="text-sm text-[#c4c4ca]">{new Date(h.day + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</span>
              <div className="flex items-center gap-2.5">
                <div className="w-28 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full bg-[#531aff] transition-all duration-300" style={{ width: `${Math.min(100, (h.ml / water.target) * 100)}%` }} />
                </div>
                <span className={`text-xs font-medium tabular-nums w-14 text-right ${h.hit ? "text-[#609f89]" : "text-[#868593]"}`}>{(h.ml / 1000).toFixed(1)}L</span>
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === "sleep" && (
        <>
          {sleepLogs.map((s) => {
            const dur = s.wakeMinute > s.bedMinute ? s.wakeMinute - s.bedMinute : 1440 - s.bedMinute + s.wakeMinute;
            const good = dur >= 420 && dur <= 540;
            const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
            return (
              <Card key={s.id} className="!py-3 mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#ffffff]">{new Date(s.day + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div className="text-[11px] text-[#868593] mt-0.5">
                    {hh(s.bedMinute)} – {hh(s.wakeMinute)} · kualitas {s.quality ?? "-"}/5
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${good ? "text-[#609f89]" : dur < 420 ? "text-[#f87171]" : "text-[#eab38a]"}`}>
                  {Math.floor(dur / 60)}j {dur % 60}m
                </span>
              </Card>
            );
          })}
          {sleepLogs.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-[#868593]">Belum ada log tidur</p>
            </div>
          )}
        </>
      )}

      {tab === "habits" && hData && (
        <>
          {hData.habits.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-[#868593]">Belum ada habit</p>
              <p className="text-[11px] text-[#868593] mt-1">Tap Tambah Habit untuk membuat</p>
            </div>
          )}
          {hData.habits.map((h) => {
            const checkedToday = hData.checkins?.some((c) => c.habitId === h.id && c.day === today) ?? false;
            const streak = hData.streaks[h.id] || { current: 0, best: 0 };
            const week = hData.weeklyCount[h.id] || 0;
            return (
              <Card key={h.id} className="mb-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleHabit(h.id)}
                    aria-label="Toggle habit hari ini"
                    className={`w-11 h-11 rounded-lg text-lg flex items-center justify-center border shrink-0 transition-colors duration-150 ${checkedToday ? "bg-[#609f89] border-[#609f89]" : "border-white/[0.1] bg-white/[0.03] hover:border-white/25"}`}
                  >
                    {checkedToday ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      h.icon
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#ffffff]">{h.name}</div>
                    <div className="text-[11px] text-[#868593]">
                      streak {streak.current} hari (best {streak.best}) · minggu ini {week}/{h.targetPerWeek}
                    </div>
                  </div>
                  <Trash onClick={() => delHabit(h.id)} />
                </div>
              </Card>
            );
          })}
        </>
      )}

      {/* Workout sheet */}
      <Sheet open={sheet === "workout"} onClose={() => setSheet(null)} title="Catat Workout">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-[#868593] mb-1 block">Jenis</label>
            <Select value={wType} onChange={(e) => setWType(e.target.value)}>
              {WORKOUT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Durasi: {wDur} menit</label>
            <div className="flex gap-1.5">
              {[15, 20, 30, 45, 60, 90].map((d) => (
                <button key={d} onClick={() => setWDur(d)} className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors duration-150 ${wDur === d ? "bg-[#553f83] text-white" : "bg-white/[0.04] border border-white/[0.06] text-[#868593]"}`}>{d}′</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Intensitas</label>
            <div className="flex gap-1.5">
              {["RINGAN", "SEDANG", "BERAT"].map((i) => (
                <button key={i} onClick={() => setWInt(i)} className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors duration-150 ${wInt === i ? "bg-[#553f83] text-white" : "bg-white/[0.04] border border-white/[0.06] text-[#868593]"}`}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1 block">Tanggal (opsional — default hari ini)</label>
            <Input type="date" value={wDay} onChange={(e) => setWDay(e.target.value)} />
          </div>
          <Btn onClick={addWorkout} disabled={busy} className="w-full py-2.5">{busy ? "…" : "Simpan"}</Btn>
        </div>
      </Sheet>

      {/* Sleep sheet */}
      <Sheet open={sheet === "sleep"} onClose={() => setSheet(null)} title="Log Tidur">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-[#868593] mb-1 block">Jam tidur</label>
              <Input type="time" value={sBed} onChange={(e) => setSBed(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-[#868593] mb-1 block">Jam bangun</label>
              <Input type="time" value={sWake} onChange={(e) => setSWake(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Kualitas: {sQuality}/5</label>
            <input type="range" min={1} max={5} value={sQuality} onChange={(e) => setSQuality(Number(e.target.value))} className="w-full accent-[#553f83]" />
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1 block">Tanggal (opsional)</label>
            <Input type="date" value={sDay} onChange={(e) => setSDay(e.target.value)} />
          </div>
          <Btn onClick={saveSleep} disabled={busy} className="w-full py-2.5">{busy ? "…" : "Simpan"}</Btn>
        </div>
      </Sheet>

      {/* Habit sheet */}
      <Sheet open={sheet === "habit"} onClose={() => setSheet(null)} title="Habit Baru">
        <div className="space-y-3">
          <Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Nama habit, mis: Baca 15 menit" />
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Ikon</label>
            <div className="flex gap-2 flex-wrap">
              {["✅", "📖", "🧘", "🦷", "🙏", "🚭", "🎸", "🧹"].map((i) => (
                <button key={i} onClick={() => setHIcon(i)} className={`w-11 h-11 rounded-md text-lg flex items-center justify-center border transition-colors duration-150 ${hIcon === i ? "border-[#531aff] bg-[#531aff]/10" : "border-white/[0.08] bg-white/[0.02]"}`}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Target per minggu: {hTarget}×</label>
            <input type="range" min={1} max={7} value={hTarget} onChange={(e) => setHTarget(Number(e.target.value))} className="w-full accent-[#553f83]" />
          </div>
          <Btn onClick={addHabit} disabled={busy} className="w-full py-2.5">{busy ? "…" : "Buat Habit"}</Btn>
        </div>
      </Sheet>
    </div>
  );
}
