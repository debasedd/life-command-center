"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, Btn, Input, Select, Sheet, SectionTitle, ProgressRing, toast, api } from "@/components/ui";

interface Workout { id: string; type: string; durationMinutes: number; intensity: string; day: string }
interface Habit { id: string; name: string; icon: string; targetPerWeek: number }
interface SleepLog { id: string; day: string; bedMinute: number; wakeMinute: number; quality: number | null }
interface HabitsRes { habits: Habit[]; checkins: { habitId: string; day: string }[]; streaks: Record<string, { current: number; best: number }>; weeklyCount: Record<string, number> }

const WORKOUT_TYPES = ["Jogging", "Lari", "Push-up & Sit-up", "Gym / Angkat Beban", "Sepeda", "Futsal", "Basket", "Renang", "Yoga", "Jalan Kaki"];
const TYPE_EMOJI: Record<string, string> = {
  Jogging: "🏃", Lari: "🏃‍♂️", "Push-up & Sit-up": "💪", "Gym / Angkat Beban": "🏋️", Sepeda: "🚴",
  Futsal: "⚽", Basket: "🏀", Renang: "🏊", Yoga: "🧘", "Jalan Kaki": "🚶",
};

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
  const [sQual, setSQual] = useState(4);
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
    setWorkouts(w.workouts);
    setWStats(w.stats);
    setWater(wa);
    setSleepLogs(s.logs);
    setHData(h);
  }
  useEffect(() => { load() }, []);

  async function addWorkout() {
    setBusy(true);
    try {
      await api("/api/workouts", { json: { type: wType, durationMinutes: wDur, intensity: wInt, day: wDay || undefined } });
      toast("Workout dicatat 💪");
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
      toast("Tidur dicatat 😴");
      setSheet(null); setSDay("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  const [sQuality, setSQuality] = useState(4);

  async function addHabit() {
    if (!hName.trim()) return toast("Nama habit wajib", "err");
    setBusy(true);
    try {
      await api("/api/habits", { json: { name: hName, icon: hIcon, targetPerWeek: hTarget } });
      toast("Habit dibuat ✅");
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

  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  // heatmap last 28 days
  const heat = useMemo(() => {
    const days: { day: string; has: boolean; minutes: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(Date.now() + 7 * 3600 * 1000);
      d.setUTCDate(d.getUTCDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const w = workouts.filter((x) => x.day === ds);
      days.push({ day: ds, has: w.length > 0, minutes: w.reduce((s, x) => s + x.durationMinutes, 0) });
    }
    return days;
  }, [workouts]);

  const waterPct = water.target > 0 ? water.todayMl / water.target : 0;
  const glasses = Math.round(water.target / water.glassMl);
  const todayGlasses = Math.round(water.todayMl / water.glassMl);

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">💪 Kesehatan</h1>
        <Btn onClick={() => setSheet(tab === "workout" ? "workout" : tab === "sleep" ? "sleep" : tab === "habits" ? "habit" : null)} className="!py-2 !px-3 text-xs" disabled={tab === "water"}>
          ＋ {tab === "workout" ? "Workout" : tab === "sleep" ? "Tidur" : tab === "habits" ? "Habit" : "Air"}
        </Btn>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {(["workout", "water", "sleep", "habits"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2 text-[11px] font-semibold ${tab === t ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>
            {t === "workout" ? "💪 Olahraga" : t === "water" ? "💧 Air" : t === "sleep" ? "😴 Tidur" : "✅ Habit"}
          </button>
        ))}
      </div>

      {tab === "workout" && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card className="text-center !py-3">
              <div className="text-2xl font-bold text-emerald-400">{wStats.thisWeekCount}</div>
              <p className="text-[10px] text-zinc-500">sesi minggu ini</p>
            </Card>
            <Card className="text-center !py-3">
              <div className="text-2xl font-bold text-amber-400">{wStats.thisWeekMinutes}</div>
              <p className="text-[10px] text-zinc-500">menit minggu ini</p>
            </Card>
            <Card className="text-center !py-3">
              <div className="text-2xl font-bold text-rose-400">🔥{wStats.streak}</div>
              <p className="text-[10px] text-zinc-500">hari beruntun</p>
            </Card>
          </div>

          <Card className="mb-4">
            <p className="text-[10px] text-zinc-500 uppercase mb-2">Konsistensi 4 minggu</p>
            <div className="grid grid-cols-14 gap-1" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
              {heat.map((h) => (
                <div
                  key={h.day}
                  title={`${h.day}: ${h.minutes} menit`}
                  className="aspect-square rounded-sm"
                  style={{ background: h.has ? (h.minutes >= 45 ? "#10b981" : h.minutes >= 25 ? "#34d399" : "#6ee7b7") : "#27272a" }}
                />
              ))}
            </div>
          </Card>

          <SectionTitle>Riwayat</SectionTitle>
          {workouts.slice(0, 15).map((w) => (
            <Card key={w.id} className="!py-2.5 mb-1.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{TYPE_EMOJI[w.type] || "🏃"} {w.type}</div>
                <div className="text-[11px] text-zinc-500">{w.day} • {w.durationMinutes} mnt • {w.intensity}</div>
              </div>
              <button
                onClick={async () => { await api(`/api/workouts?id=${w.id}`, { method: "DELETE" }); await load(); }}
                className="text-[10px] text-zinc-600"
              >
                🗑
              </button>
            </Card>
          ))}
          {workouts.length === 0 && <Card className="text-sm text-zinc-500 text-center py-8">Belum ada workout.</Card>}
        </>
      )}

      {tab === "water" && (
        <>
          <Card className="text-center py-6 mb-4">
            <ProgressRing value={waterPct} size={140} stroke={12} color="#38bdf8">
              <div>
                <div className="text-3xl font-bold">{(water.todayMl / 1000).toFixed(2)}L</div>
                <div className="text-xs text-zinc-500">dari {(water.target / 1000).toFixed(1)}L</div>
              </div>
            </ProgressRing>
            <div className="flex justify-center gap-1 mt-4">
              {Array.from({ length: glasses }).map((_, i) => (
                <span key={i} className="text-xl">{i < todayGlasses ? "🥛" : "🥃"}</span>
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-5">
              <Btn onClick={() => quickWater(1)} className="px-8">💧 +1 Gelas</Btn>
              <Btn variant="ghost" onClick={() => quickWater(2)}>+2</Btn>
              <Btn variant="ghost" onClick={undoWater} className="text-xs">↩ Undo</Btn>
            </div>
          </Card>

          <SectionTitle>7 Hari Terakhir</SectionTitle>
          {water.history.slice().reverse().map((h) => (
            <Card key={h.day} className="!py-2.5 mb-1.5 flex items-center justify-between">
              <span className="text-sm">{new Date(h.day + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</span>
              <div className="flex items-center gap-2">
                <div className="w-28 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${Math.min(100, (h.ml / water.target) * 100)}%` }} />
                </div>
                <span className={`text-xs font-bold ${h.hit ? "text-emerald-400" : "text-zinc-500"}`}>{(h.ml / 1000).toFixed(1)}L {h.hit ? "✓" : ""}</span>
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === "sleep" && (
        <>
          <Btn onClick={() => setSheet("sleep")} className="w-full mb-3">😴 Catat Tidur Malam Ini</Btn>
          {sleepLogs.map((s) => {
            const dur = s.wakeMinute > s.bedMinute ? s.wakeMinute - s.bedMinute : 1440 - s.bedMinute + s.wakeMinute;
            const good = dur >= 420 && dur <= 540;
            return (
              <Card key={s.id} className="!py-3 mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{new Date(s.day + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div className="text-[11px] text-zinc-500">
                    🌙 {String(Math.floor(s.bedMinute / 60)).padStart(2, "0")}:{String(s.bedMinute % 60).padStart(2, "0")} → ☀️ {String(Math.floor(s.wakeMinute / 60)).padStart(2, "0")}:{String(s.wakeMinute % 60).padStart(2, "0")} • kualitas {"⭐".repeat(s.quality || 0)}
                  </div>
                </div>
                <span className={`text-sm font-bold ${good ? "text-emerald-400" : dur < 420 ? "text-rose-400" : "text-amber-400"}`}>
                  {Math.floor(dur / 60)}j {dur % 60}m
                </span>
              </Card>
            );
          })}
          {sleepLogs.length === 0 && <Card className="text-sm text-zinc-500 text-center py-8">Belum ada log tidur.</Card>}
        </>
      )}

      {tab === "habits" && hData && (
        <>
          {hData.habits.length === 0 && <Card className="text-sm text-zinc-500 text-center py-8 mb-3">Belum ada habit. Buat satu!</Card>}
          {hData.habits.map((h) => {
            const checkedToday = hData.checkins?.some((c) => c.habitId === h.id && c.day === today) ?? false;
            const streak = hData.streaks[h.id] || { current: 0, best: 0 };
            const week = hData.weeklyCount[h.id] || 0;
            return (
              <Card key={h.id} className="mb-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleHabit(h.id)}
                    className={`w-12 h-12 rounded-2xl text-xl flex items-center justify-center border-2 shrink-0 transition ${checkedToday ? "bg-emerald-600 border-emerald-600" : "border-zinc-700 bg-zinc-800"}`}
                  >
                    {checkedToday ? "✓" : h.icon}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{h.name}</div>
                    <div className="text-[11px] text-zinc-500">
                      🔥 {streak.current} hari (best {streak.best}) • minggu ini {week}/{h.targetPerWeek}
                    </div>
                  </div>
                  <button onClick={() => delHabit(h.id)} className="text-[10px] text-zinc-600">🗑</button>
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
            <label className="text-xs text-zinc-400 mb-1 block">Jenis</label>
            <Select value={wType} onChange={(e) => setWType(e.target.value)}>
              {WORKOUT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Durasi: {wDur} menit</label>
            <div className="flex gap-1.5">
              {[15, 20, 30, 45, 60, 90].map((d) => (
                <button key={d} onClick={() => setWDur(d)} className={`flex-1 rounded-lg py-2 text-xs font-bold ${wDur === d ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>{d}′</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Intensitas</label>
            <div className="flex gap-1.5">
              {["RINGAN", "SEDANG", "BERAT"].map((i) => (
                <button key={i} onClick={() => setWInt(i)} className={`flex-1 rounded-lg py-2 text-xs font-bold ${wInt === i ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tanggal (opsional — default hari ini)</label>
            <Input type="date" value={wDay} onChange={(e) => setWDay(e.target.value)} />
          </div>
          <Btn onClick={addWorkout} disabled={busy} className="w-full py-3">{busy ? "…" : "Simpan"}</Btn>
        </div>
      </Sheet>

      {/* Sleep sheet */}
      <Sheet open={sheet === "sleep"} onClose={() => setSheet(null)} title="Log Tidur">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Jam tidur</label>
              <Input type="time" value={sBed} onChange={(e) => setSBed(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Jam bangun</label>
              <Input type="time" value={sWake} onChange={(e) => setSWake(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Kualitas: {"⭐".repeat(sQuality)}</label>
            <input type="range" min={1} max={5} value={sQuality} onChange={(e) => setSQuality(Number(e.target.value))} className="w-full accent-indigo-600" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tanggal (opsional)</label>
            <Input type="date" value={sDay} onChange={(e) => setSDay(e.target.value)} />
          </div>
          <Btn onClick={saveSleep} disabled={busy} className="w-full py-3">{busy ? "…" : "Simpan"}</Btn>
        </div>
      </Sheet>

      {/* Habit sheet */}
      <Sheet open={sheet === "habit"} onClose={() => setSheet(null)} title="Habit Baru">
        <div className="space-y-3">
          <Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Nama habit, mis: Baca 15 menit" />
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Ikon</label>
            <div className="flex gap-2 flex-wrap">
              {["✅", "📖", "🧘", "🦷", "🙏", "🚭", "🎸", "🧹"].map((i) => (
                <button key={i} onClick={() => setHIcon(i)} className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border ${hIcon === i ? "border-indigo-500 bg-indigo-500/15" : "border-zinc-800"}`}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Target per minggu: {hTarget}× </label>
            <input type="range" min={1} max={7} value={hTarget} onChange={(e) => setHTarget(Number(e.target.value))} className="w-full accent-indigo-600" />
          </div>
          <Btn onClick={addHabit} disabled={busy} className="w-full py-3">{busy ? "…" : "Buat Habit"}</Btn>
        </div>
      </Sheet>
    </div>
  );
}