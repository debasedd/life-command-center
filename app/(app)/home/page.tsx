"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle, ProgressRing, Btn } from "@/components/ui";
import PushManager from "@/components/push-manager";

interface DashData {
  today: string;
  nowMinute: number;
  currentBlock: { title: string; type: string; startMinute: number; endMinute: number } | null;
  nextBlock: { title: string; type: string; startMinute: number } | null;
  todayBlocks: { id: string; title: string; type: string; startMinute: number; endMinute: number }[];
  tasks: { dueToday: number; overdue: number; next: { id: string; title: string; priority: string; deadline: string | null }[] };
  finance: { todayIncome: number; todayExpense: number; txCountToday: number; weekIncome: number; weekExpense: number };
  water: { todayMl: number; target: number; glassMl: number };
  habits: { total: number; done: number; items: { id: string; name: string; icon: string; done: boolean }[] };
  workout: { todayCount: number; weekCount: number; target: number };
  goals: { id: string; name: string; icon: string; progress: number; currentAmount: number; targetAmount: number }[];
  latestEval: { healthScore: number; createdAt: string } | null;
}

const TYPE_STYLE: Record<string, string> = {
  SCHOOL: "border-l-indigo-500 bg-indigo-500/10",
  LESSON: "border-l-amber-500 bg-amber-500/10",
  ACTIVITY: "border-l-emerald-500 bg-emerald-500/10",
  PERSONAL: "border-l-zinc-500 bg-zinc-500/10",
};

function hhmm(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function idr(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

export default function HomeDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [waterBusy, setWaterBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function addWater() {
    setWaterBusy(true);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glasses: 1 }),
      });
      if (res.ok) await load();
    } finally {
      setWaterBusy(false);
    }
  }

  async function toggleHabit(id: string) {
    await fetch("/api/habits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-zinc-500">
        <div className="text-3xl mb-2 animate-pulse">🧭</div>Memuat…
      </div>
    );
  }

  const waterPct = data.water.target > 0 ? data.water.todayMl / data.water.target : 0;
  const dateStr = new Date(data.today + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="animate-rise">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-zinc-500">{dateStr}</p>
          <h1 className="text-xl font-bold">Halo, Fatih 👋</h1>
        </div>
        <Link href="/profile">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">⚙️</div>
        </Link>
      </div>

      <PushManager />

      {/* Sekarang */}
      <Card className={`mb-3 border-l-4 ${data.currentBlock ? TYPE_STYLE[data.currentBlock.type] || TYPE_STYLE.PERSONAL : "border-l-zinc-700"}`}>
        <p className="text-xs text-zinc-400 mb-1">SEKARANG</p>
        {data.currentBlock ? (
          <>
            <div className="font-bold text-lg">{data.currentBlock.title}</div>
            <div className="text-sm text-zinc-400">
              {hhmm(data.currentBlock.startMinute)} – {hhmm(data.currentBlock.endMinute)}
            </div>
          </>
        ) : (
          <div className="font-semibold text-zinc-300">
            {data.nextBlock ? `Bebas — blok berikutnya: ${data.nextBlock.title} @ ${hhmm(data.nextBlock.startMinute)}` : "Bebas / di luar jadwal"}
          </div>
        )}
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card className="text-center !p-3">
          <ProgressRing value={waterPct} size={52} color="#38bdf8">
            <span className="text-xs font-bold">{Math.round(waterPct * 100)}%</span>
          </ProgressRing>
          <p className="text-[10px] text-zinc-400 mt-1">Air {(data.water.todayMl / 1000).toFixed(1)}L</p>
          <button onClick={addWater} disabled={waterBusy} className="mt-1 text-[10px] bg-sky-500/20 text-sky-300 rounded-lg px-2 py-1 font-semibold active:scale-95 transition disabled:opacity-50">
            +1 Gelas
          </button>
        </Card>
        <Card className="text-center !p-3">
          <ProgressRing value={data.habits.total ? data.habits.done / data.habits.total : 0} size={52} color="#a78bfa">
            <span className="text-xs font-bold">
              {data.habits.done}/{data.habits.total}
            </span>
          </ProgressRing>
          <p className="text-[10px] text-zinc-400 mt-1">Habit</p>
          <Link href="/health">
            <span className="mt-1 inline-block text-[10px] bg-violet-500/20 text-violet-300 rounded-lg px-2 py-1 font-semibold">Cek</span>
          </Link>
        </Card>
        <Card className="text-center !p-3">
          <ProgressRing value={Math.min(1, data.workout.weekCount / Math.max(1, data.workout.target))} size={52} color="#34d399">
            <span className="text-xs font-bold">{data.workout.weekCount}</span>
          </ProgressRing>
          <p className="text-[10px] text-zinc-400 mt-1">Olahraga/mgg</p>
          <Link href="/health">
            <span className="mt-1 inline-block text-[10px] bg-emerald-500/20 text-emerald-300 rounded-lg px-2 py-1 font-semibold">Log</span>
          </Link>
        </Card>
      </div>

      {/* Tugas */}
      <SectionTitle action={<Link href="/tasks" className="text-xs text-indigo-400">Semua →</Link>}>Tugas Sekolah</SectionTitle>
      {data.tasks.overdue > 0 && (
        <Card className="mb-2 border border-rose-800 bg-rose-950/40">
          <span className="text-rose-300 text-sm font-semibold">⚠️ {data.tasks.overdue} tugas terlambat</span>
        </Card>
      )}
      {data.tasks.next.length === 0 ? (
        <Card className="text-sm text-zinc-500">Tidak ada tugas aktif. 🎉</Card>
      ) : (
        <div className="space-y-2">
          {data.tasks.next.slice(0, 3).map((t) => (
            <Card key={t.id} className="flex items-center justify-between !py-3">
              <div>
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-zinc-500">
                  {t.deadline ? new Date(t.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Tanpa deadline"}
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                  t.priority === "URGENT" ? "bg-rose-500/20 text-rose-300" : t.priority === "HIGH" ? "bg-amber-500/20 text-amber-300" : "bg-zinc-700 text-zinc-300"
                }`}
              >
                {t.priority}
              </span>
            </Card>
          ))}
        </div>
      )}

      {/* Jadwal hari ini */}
      <SectionTitle action={<Link href="/tasks" className="text-xs text-indigo-400">Kelola →</Link>}>Jadwal Hari Ini</SectionTitle>
      {data.todayBlocks.length === 0 ? (
        <Card className="text-sm text-zinc-500">Tidak ada jadwal.</Card>
      ) : (
        <div className="space-y-2">
          {data.todayBlocks.map((b) => (
            <Card key={b.id} className={`border-l-4 !py-3 ${TYPE_STYLE[b.type] || TYPE_STYLE.PERSONAL}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{b.title}</div>
                  <div className="text-xs text-zinc-400">
                    {hhmm(b.startMinute)} – {hhmm(b.endMinute)}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase">{b.type}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Keuangan ringkas */}
      <SectionTitle action={<Link href="/finance" className="text-xs text-indigo-400">Detail →</Link>}>Uang Hari Ini</SectionTitle>
      <Card>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-emerald-400">Masuk: {idr(data.finance.todayIncome)}</span>
          <span className="text-rose-400">Keluar: {idr(data.finance.todayExpense)}</span>
        </div>
        <div className="text-xs text-zinc-500">{data.finance.txCountToday} transaksi tercatat hari ini</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/finance">
            <Btn variant="ghost" className="w-full text-xs">＋ Catat</Btn>
          </Link>
          <Link href="/whatif">
            <Btn variant="ghost" className="w-full text-xs">🔮 What-If</Btn>
          </Link>
        </div>
      </Card>

      {/* Goals */}
      {data.goals.length > 0 && (
        <>
          <SectionTitle>Target Tabungan</SectionTitle>
          <div className="space-y-2">
            {data.goals.map((g) => (
              <Card key={g.id} className="!py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">
                    {g.icon} {g.name}
                  </div>
                  <div className="text-xs text-zinc-400">{Math.round(g.progress * 100)}%</div>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${Math.min(100, g.progress * 100)}%` }} />
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {idr(g.currentAmount)} / {idr(g.targetAmount)}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {data.latestEval && (
        <>
          <SectionTitle>Skor Keuangan</SectionTitle>
          <Card className="flex items-center gap-4">
            <ProgressRing value={data.latestEval.healthScore / 100} size={60} color={data.latestEval.healthScore >= 75 ? "#34d399" : data.latestEval.healthScore >= 50 ? "#fbbf24" : "#fb7185"}>
              <span className="text-sm font-bold">{data.latestEval.healthScore}</span>
            </ProgressRing>
            <div className="text-xs text-zinc-400">
              Skor terakhir dari AI Financial Advisor.
              <Link href="/advisor" className="block text-indigo-400 font-semibold mt-1">
                Buka evaluasi →
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}