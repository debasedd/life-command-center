"use client";

import { useEffect, useLayoutEffect, useState, useMemo } from "react";
import { Card, Btn, Input, Select, Sheet, SectionTitle, Row, SignalBar, ProgressRing, Icon, ICON_CHOICES, toast, api } from "@/components/ui";
import { wibToday } from "@/lib/wib";
import { readCache, writeCache } from "@/lib/cache";

interface Workout { id: string; type: string; durationMinutes: number; intensity: string; day: string }
interface Habit { id: string; name: string; icon: string; targetPerWeek: number }
interface SleepLog { id: string; day: string; bedMinute: number; wakeMinute: number; quality: number | null }
interface HabitsRes { habits: Habit[]; checkins: { habitId: string; day: string }[]; streaks: Record<string, { current: number; best: number }>; weeklyCount: Record<string, number> }

const WORKOUT_TYPES = ["Jogging", "Lari", "Push-up & Sit-up", "Gym / Angkat Beban", "Sepeda", "Futsal", "Basket", "Renang", "Yoga", "Jalan Kaki"];

function Trash({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 text-muted hover:text-[color:var(--ui-danger)] transition-colors duration-[160ms]" aria-label="Hapus">
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
  const [hIcon, setHIcon] = useState("check");
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
    <div className="fade-rise">
      <header className="flex items-end justify-between gap-3 mb-5 pt-1">
        <div>
          <p className="kicker">Tubuh & Kebiasaan</p>
          <h1 className="display mt-1">Kesehatan</h1>
        </div>
        <Btn
          onClick={() => setSheet(tab === "workout" ? "workout" : tab === "sleep" ? "sleep" : tab === "habits" ? "habit" : null)}
          className="!py-1.5 !px-3 text-xs"
          disabled={tab === "water"}
        >
          {`Tambah ${TAB_LABEL[tab]}`}
        </Btn>
      </header>

      {/* Segmented control */}
      <div className="grid grid-cols-4 gap-1 rounded-card bg-black/[0.03] border border-lineSoft p-1 mb-2">
        {(["workout", "water", "sleep", "habits"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md py-1.5 text-[11px] font-medium transition-colors duration-[160ms] ${tab === t ? "bg-black/[0.07] text-ink" : "text-muted"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "workout" && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-xl font-semibold text-ink num">{wStats.thisWeekCount}</div>
              <p className="kicker mt-0.5">sesi minggu ini</p>
            </div>
            <div>
              <div className="text-xl font-semibold text-ink num">{wStats.thisWeekMinutes}</div>
              <p className="kicker mt-0.5">menit minggu ini</p>
            </div>
            <div>
              <div className="text-xl font-semibold text-[color:var(--ui-warning)] num">{wStats.streak}</div>
              <p className="kicker mt-0.5">hari beruntun</p>
            </div>
          </div>

          <Card className="mb-3">
            <p className="text-[10px] text-muted mb-2">Konsistensi 4 minggu</p>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
              {heat.map((h) => (
                <div
                  key={h.day}
                  title={`${h.day}: ${h.minutes} menit`}
                  className="aspect-square rounded-[3px] transition-colors duration-300"
                  style={{ background: h.has ? (h.minutes >= 45 ? "var(--ui-positive)" : h.minutes >= 25 ? "#34d399" : "#d1fae5") : "rgba(17,17,19,0.06)" }}
                />
              ))}
            </div>
          </Card>

          <SectionTitle>Riwayat</SectionTitle>
          {workouts.slice(0, 15).map((w) => (
            <Row key={w.id}>
              <div>
                <div className="text-sm font-medium text-ink">{w.type}</div>
                <div className="text-[11px] text-muted">{w.day} · {w.durationMinutes} mnt · {w.intensity.toLowerCase()}</div>
              </div>
              <Trash onClick={async () => { await api(`/api/workouts?id=${w.id}`, { method: "DELETE" }); await load(); }} />
            </Row>
          ))}
          {workouts.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-muted">Belum ada workout</p>
            </div>
          )}
        </>
      )}

      {tab === "water" && (
        <>
          <Card className="text-center py-7 mb-3">
            <div className="flex justify-center">
              <ProgressRing value={waterPct} size={140} stroke={10} color="var(--ui-text)">
                <div>
                  <div className="text-2xl font-semibold text-ink tabular-nums">{(water.todayMl / 1000).toFixed(2)}L</div>
                  <div className="text-[11px] text-muted">dari {(water.target / 1000).toFixed(1)}L</div>
                </div>
              </ProgressRing>
            </div>
            <div className="flex justify-center gap-1 mt-4">
              {Array.from({ length: glasses }).map((_, i) => (
                <span key={i} className={`w-2 h-4 rounded-[2px] ${i < todayGlasses ? "bg-[color:var(--ui-text)]" : "bg-black/[0.07]"}`} />
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
            <Row key={h.day}>
              <span className="text-sm text-soft shrink-0">{new Date(h.day + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</span>
              <div className="flex items-center gap-2.5 flex-1 justify-end">
                <SignalBar value={h.ml / water.target} className="w-28" />
                <span className={`text-xs font-medium num w-14 text-right ${h.hit ? "text-[color:var(--ui-positive)]" : "text-muted"}`}>{(h.ml / 1000).toFixed(1)}L</span>
              </div>
            </Row>
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
              <Row key={s.id}>
                <div>
                  <div className="text-sm font-medium text-ink">{new Date(s.day + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {hh(s.bedMinute)} – {hh(s.wakeMinute)} · kualitas {s.quality ?? "-"}/5
                  </div>
                </div>
                <span className={`text-sm font-semibold num ${good ? "text-[color:var(--ui-positive)]" : dur < 420 ? "text-[color:var(--ui-danger)]" : "text-[color:var(--ui-warning)]"}`}>
                  {Math.floor(dur / 60)}j {dur % 60}m
                </span>
              </Row>
            );
          })}
          {sleepLogs.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-muted">Belum ada log tidur</p>
            </div>
          )}
        </>
      )}

      {tab === "habits" && hData && (
        <>
          {hData.habits.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-muted">Belum ada habit</p>
              <p className="text-[11px] text-muted mt-1">Tap Tambah Habit untuk membuat</p>
            </div>
          )}
          {hData.habits.map((h) => {
            const checkedToday = hData.checkins?.some((c) => c.habitId === h.id && c.day === today) ?? false;
            const streak = hData.streaks[h.id] || { current: 0, best: 0 };
            const week = hData.weeklyCount[h.id] || 0;
            return (
              <Row key={h.id} className="gap-3">
                <button
                  onClick={() => toggleHabit(h.id)}
                  aria-label="Toggle habit hari ini"
                  aria-pressed={checkedToday}
                  className={`w-11 h-11 rounded-card text-lg flex items-center justify-center border shrink-0 transition-colors duration-[160ms] ${checkedToday ? "bg-[color:var(--ui-positive)] border-[color:var(--ui-positive)]" : "border-black/[0.08] bg-black/[0.03] hover:border-black/20"}`}
                >
                  {checkedToday ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <Icon name={h.icon} size={19} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{h.name}</div>
                  <div className="text-[11px] text-muted">
                    streak {streak.current} hari (best {streak.best}) · minggu ini {week}/{h.targetPerWeek}
                  </div>
                </div>
                <Trash onClick={() => delHabit(h.id)} />
              </Row>
            );
          })}
        </>
      )}

      {/* Workout sheet */}
      <Sheet open={sheet === "workout"} onClose={() => setSheet(null)} title="Catat Workout">
        <div className="space-y-3">
          <div>
            <label className="kicker mb-1 block">Jenis</label>
            <Select value={wType} onChange={(e) => setWType(e.target.value)}>
              {WORKOUT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <label className="kicker mb-1.5 block">Durasi: {wDur} menit</label>
            <div className="flex gap-1.5">
              {[15, 20, 30, 45, 60, 90].map((d) => (
                <button key={d} onClick={() => setWDur(d)} className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors duration-[160ms] ${wDur === d ? "bg-[color:var(--ui-primary)] text-white" : "bg-black/[0.04] border border-lineSoft text-muted"}`}>{d}′</button>
              ))}
            </div>
          </div>
          <div>
            <label className="kicker mb-1.5 block">Intensitas</label>
            <div className="flex gap-1.5">
              {["RINGAN", "SEDANG", "BERAT"].map((i) => (
                <button key={i} onClick={() => setWInt(i)} className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors duration-[160ms] ${wInt === i ? "bg-[color:var(--ui-primary)] text-white" : "bg-black/[0.04] border border-lineSoft text-muted"}`}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="kicker mb-1 block">Tanggal (opsional — default hari ini)</label>
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
              <label className="kicker mb-1 block">Jam tidur</label>
              <Input type="time" value={sBed} onChange={(e) => setSBed(e.target.value)} />
            </div>
            <div>
              <label className="kicker mb-1 block">Jam bangun</label>
              <Input type="time" value={sWake} onChange={(e) => setSWake(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="kicker mb-1.5 block">Kualitas: {sQuality}/5</label>
            <input type="range" min={1} max={5} value={sQuality} onChange={(e) => setSQuality(Number(e.target.value))} className="w-full accent-[color:var(--ui-primary)]" />
          </div>
          <div>
            <label className="kicker mb-1 block">Tanggal (opsional)</label>
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
            <label className="kicker mb-1.5 block">Ikon</label>
            <div className="flex gap-2 flex-wrap">
              {ICON_CHOICES.slice(12, 24).map((i) => (
                              <button
                                key={i}
                                onClick={() => setHIcon(i)}
                                aria-label={i}
                                className={`w-11 h-11 rounded-control flex items-center justify-center border press transition-[border-color,background-color,box-shadow] duration-[180ms] ${
                                  hIcon === i
                                    ? "border-[color:var(--ui-text)] bg-[color:var(--ui-surface-muted)] shadow-[var(--shadow-xs)] text-[color:var(--ui-text)]"
                                    : "border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-soft)]"
                                }`}
                              >
                                <Icon name={i} size={18} />
                              </button>
                            ))}
            </div>
          </div>
          <div>
            <label className="kicker mb-1.5 block">Target per minggu: {hTarget}×</label>
            <input type="range" min={1} max={7} value={hTarget} onChange={(e) => setHTarget(Number(e.target.value))} className="w-full accent-[color:var(--ui-primary)]" />
          </div>
          <Btn onClick={addHabit} disabled={busy} className="w-full py-2.5">{busy ? "…" : "Buat Habit"}</Btn>
        </div>
      </Sheet>
    </div>
  );
}
