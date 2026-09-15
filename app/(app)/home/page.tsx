"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle, Btn } from "@/components/ui";
import PushManager from "@/components/push-manager";
import { readCache, writeCache } from "@/lib/cache";

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

const TYPE_ACCENT: Record<string, string> = { SCHOOL: "#7170ff", LESSON: "#f5a623", ACTIVITY: "#27a644", PERSONAL: "#62666d" };
const PRIORITY_DOT: Record<string, string> = { URGENT: "#eb5757", HIGH: "#f5a623", MEDIUM: "#7170ff", LOW: "#62666d" };

function hhmm(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function idr(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

export default function HomeDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [waterBusy, setWaterBusy] = useState(false);

  // Cache-first paint: hydrate from localStorage before first paint — no empty flash.
  useLayoutEffect(() => {
    const c = readCache<DashData>("dashboard");
    if (c) setData(c);
  }, []);

  async function load() {
    const res = await fetch("/api/dashboard");
    if (res.ok) {
      const d = await res.json();
      writeCache("dashboard", d);
      setData(d);
    }
  }

  useEffect(() => {
    load();
    // BootGate has already warmed every tab's cache; home only revalidates its own data.
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

  if (!data) {
    return (
      <div className="animate-rise space-y-3 pt-2" aria-hidden>
        <div className="h-8 w-48 rounded-md bg-white/[0.04] pulse" />
        <div className="h-20 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-28 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
          <div className="h-28 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
          <div className="h-28 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
        </div>
        <div className="h-36 rounded-lg bg-white/[0.03] border border-white/[0.06] pulse" />
      </div>
    );
  }

  const waterPct = data.water.target > 0 ? data.water.todayMl / data.water.target : 0;
  const dateStr = new Date(data.today + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const hour = Math.floor(data.nowMinute / 60);
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="animate-rise">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 pt-1">
        <div>
          <p className="text-[11px] text-[#8a8f98]">{dateStr}</p>
          <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">{greeting}, Fatih</h1>
        </div>
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[13px] font-medium text-[#d0d6e0] transition-colors duration-150 hover:bg-white/[0.07]"
          aria-label="Profil"
        >
          F
        </Link>
      </header>

      <PushManager />

      {/* Sekarang */}
      <Card className="mb-3">
        <div className="flex items-center gap-3">
          <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: data.currentBlock ? TYPE_ACCENT[data.currentBlock.type] || "#62666d" : "rgba(255,255,255,0.12)" }} />
          <div className="min-w-0">
            <p className="text-[10px] text-[#8a8f98] mb-0.5">Sekarang</p>
            {data.currentBlock ? (
              <>
                <div className="font-medium text-[#f7f8f8] truncate">{data.currentBlock.title}</div>
                <div className="text-xs text-[#8a8f98] tabular-nums">
                  {hhmm(data.currentBlock.startMinute)} – {hhmm(data.currentBlock.endMinute)}
                </div>
              </>
            ) : (
              <div className="text-sm text-[#d0d6e0] font-medium">
                {data.nextBlock ? `Bebas · ${data.nextBlock.title} @ ${hhmm(data.nextBlock.startMinute)}` : "Bebas / di luar jadwal"}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Hari ini — composed summary, no icon boxes */}
      <SectionTitle>Hari Ini</SectionTitle>
      <Card className="mb-3">
        <div className="space-y-4">
          {/* Air */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="text-[#f7f8f8] font-medium">Minum air</span>
                <span className="text-[#8a8f98] tabular-nums">{(data.water.todayMl / 1000).toFixed(1)} / {(data.water.target / 1000).toFixed(1)} L</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full bg-[#7170ff] transition-all duration-300" style={{ width: `${Math.min(100, waterPct * 100)}%` }} />
              </div>
            </div>
            <button
              onClick={addWater}
              disabled={waterBusy}
              className="shrink-0 text-[11px] text-[#7170ff] border border-[#7170ff]/30 rounded-md px-2.5 py-1.5 font-medium transition-colors duration-150 hover:bg-[#7170ff]/10 disabled:opacity-50"
            >
              + Gelas
            </button>
          </div>
          {/* Habit */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="text-[#f7f8f8] font-medium">Habit</span>
                <span className="text-[#8a8f98] tabular-nums">{data.habits.done}/{data.habits.total}</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full bg-[#27a644] transition-all duration-300" style={{ width: `${data.habits.total ? (data.habits.done / data.habits.total) * 100 : 0}%` }} />
              </div>
            </div>
            <Link href="/health" className="shrink-0 text-[11px] text-[#8a8f98] border border-white/[0.08] rounded-md px-2.5 py-1.5 font-medium transition-colors duration-150 hover:bg-white/[0.04]">
              Buka
            </Link>
          </div>
          {/* Olahraga */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="text-[#f7f8f8] font-medium">Olahraga minggu ini</span>
                <span className="text-[#8a8f98] tabular-nums">{data.workout.weekCount}/{data.workout.target}</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full bg-[#f5a623] transition-all duration-300" style={{ width: `${Math.min(100, (data.workout.weekCount / Math.max(1, data.workout.target)) * 100)}%` }} />
              </div>
            </div>
            <Link href="/health" className="shrink-0 text-[11px] text-[#8a8f98] border border-white/[0.08] rounded-md px-2.5 py-1.5 font-medium transition-colors duration-150 hover:bg-white/[0.04]">
              Log
            </Link>
          </div>
        </div>
      </Card>

      {/* Tugas */}
      <SectionTitle action={<Link href="/tasks" className="text-xs text-[#7170ff] hover:text-[#828fff] transition-colors duration-150">Semua</Link>}>Tugas Sekolah</SectionTitle>
      {data.tasks.overdue > 0 && (
        <Card className="mb-2 !py-2.5 border-[#eb5757]/30">
          <span className="text-[#eb5757] text-[13px] font-medium">{data.tasks.overdue} tugas terlambat — segera kerjakan</span>
        </Card>
      )}
      {data.tasks.next.length === 0 ? (
        <p className="text-sm text-[#62666d] py-3">Tidak ada tugas aktif</p>
      ) : (
        <div className="space-y-1.5">
          {data.tasks.next.slice(0, 3).map((t) => (
            <Card key={t.id} className="flex items-center justify-between !py-2.5">
              <div className="min-w-0 pr-2">
                <div className="text-sm font-medium text-[#f7f8f8] truncate">{t.title}</div>
                <div className="text-[11px] text-[#62666d]">
                  {t.deadline ? new Date(t.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Tanpa deadline"}
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#8a8f98] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_DOT[t.priority] || "#62666d" }} />
                {t.priority}
              </span>
            </Card>
          ))}
        </div>
      )}

      {/* Jadwal hari ini */}
      <SectionTitle action={<Link href="/tasks" className="text-xs text-[#7170ff] hover:text-[#828fff] transition-colors duration-150">Kelola</Link>}>Jadwal Hari Ini</SectionTitle>
      {data.todayBlocks.length === 0 ? (
        <p className="text-sm text-[#62666d] py-3">Tidak ada jadwal</p>
      ) : (
        <div className="space-y-1.5">
          {data.todayBlocks.map((b) => (
            <Card key={b.id} className="!py-2.5">
              <div className="flex items-center gap-3">
                <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: TYPE_ACCENT[b.type] || "#62666d" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#f7f8f8] truncate">{b.title}</div>
                  <div className="text-[11px] text-[#62666d] tabular-nums">
                    {hhmm(b.startMinute)} – {hhmm(b.endMinute)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Keuangan ringkas */}
      <SectionTitle action={<Link href="/finance" className="text-xs text-[#7170ff] hover:text-[#828fff] transition-colors duration-150">Detail</Link>}>Uang Hari Ini</SectionTitle>
      <Card>
        <div className="flex justify-between text-[13px] mb-2 tabular-nums">
          <span className="text-[#2fbd50] font-medium">Masuk {idr(data.finance.todayIncome)}</span>
          <span className="text-[#eb5757] font-medium">Keluar {idr(data.finance.todayExpense)}</span>
        </div>
        <div className="text-[11px] text-[#62666d]">{data.finance.txCountToday} transaksi tercatat hari ini</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/finance">
            <Btn variant="ghost" className="w-full !py-1.5 text-xs">Catat</Btn>
          </Link>
          <Link href="/whatif">
            <Btn variant="ghost" className="w-full !py-1.5 text-xs">What-If</Btn>
          </Link>
        </div>
      </Card>

      {/* Goals */}
      {data.goals.length > 0 && (
        <>
          <SectionTitle>Target Tabungan</SectionTitle>
          <div className="space-y-1.5">
            {data.goals.map((g) => (
              <Card key={g.id} className="!py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-[#f7f8f8] flex items-center gap-2">
                    <span>{g.icon}</span> {g.name}
                  </div>
                  <div className="text-xs text-[#8a8f98] tabular-nums">{Math.round(g.progress * 100)}%</div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full bg-[#5e6ad2] transition-all duration-300" style={{ width: `${Math.min(100, g.progress * 100)}%` }} />
                </div>
                <div className="text-[10px] text-[#62666d] mt-1 tabular-nums">
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
            <div className="shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center" style={{ borderColor: data.latestEval.healthScore >= 75 ? "#27a644" : data.latestEval.healthScore >= 50 ? "#f5a623" : "#eb5757" }}>
              <span className="text-sm font-semibold text-[#f7f8f8] tabular-nums">{data.latestEval.healthScore}</span>
            </div>
            <div className="text-xs text-[#8a8f98]">
              Skor kesehatan keuangan terakhir.
              <Link href="/advisor" className="block text-[#7170ff] font-medium mt-1 hover:text-[#828fff] transition-colors duration-150">
                Buka evaluasi
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
