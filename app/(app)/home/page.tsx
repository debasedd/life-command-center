"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Card, RailCard, Row, SectionTitle, SignalBar, Chip, Btn, Empty } from "@/components/ui";
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

const TYPE_ACCENT: Record<string, string> = { SCHOOL: "var(--vr-accent)", LESSON: "var(--vr-warning)", ACTIVITY: "var(--vr-positive)", PERSONAL: "var(--vr-text-muted)" };
const PRIORITY_TONE: Record<string, "danger" | "warning" | "accent" | "neutral"> = { URGENT: "danger", HIGH: "warning", MEDIUM: "accent", LOW: "neutral" };

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
        <div className="h-8 w-48 rounded-control bg-white/[0.04] pulse" />
        <div className="h-20 rounded-panel bg-white/[0.03] border border-lineSoft pulse" />
        <div className="h-36 rounded-card bg-white/[0.03] border border-lineSoft pulse" />
      </div>
    );
  }

  const waterPct = data.water.target > 0 ? data.water.todayMl / data.water.target : 0;
  const dateStr = new Date(data.today + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const hour = Math.floor(data.nowMinute / 60);
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="animate-rise">
      {/* Header: date kicker + serif display greeting */}
      <header className="flex items-end justify-between gap-3 mb-5 pt-1">
        <div>
          <p className="vr-kicker">{dateStr}</p>
          <h1 className="vr-display mt-1">{greeting}, Fatih</h1>
        </div>
        <Link
          href="/profile"
          className="w-9 h-9 shrink-0 rounded-full border border-lineSoft flex items-center justify-center text-[13px] font-medium text-soft transition-colors duration-[160ms] hover:bg-white/[0.04] mb-1"
          aria-label="Profil"
        >
          F
        </Link>
      </header>

      {/* Sekarang — the single hero surface (rail gradient) */}
      <RailCard className="mb-2">
        <div className="flex items-center gap-3">
          <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: data.currentBlock ? TYPE_ACCENT[data.currentBlock.type] || "var(--vr-text-muted)" : "rgba(255,255,255,0.12)" }} />
          <div className="min-w-0">
            <p className="vr-kicker mb-1">Sekarang</p>
            {data.currentBlock ? (
              <>
                <div className="font-medium text-ink truncate">{data.currentBlock.title}</div>
                <div className="text-xs text-muted vr-num">
                  {hhmm(data.currentBlock.startMinute)} – {hhmm(data.currentBlock.endMinute)}
                </div>
              </>
            ) : (
              <div className="text-sm text-soft font-medium">
                {data.nextBlock ? `Bebas · ${data.nextBlock.title} @ ${hhmm(data.nextBlock.startMinute)}` : "Bebas / di luar jadwal"}
              </div>
            )}
          </div>
        </div>
      </RailCard>

      {/* Hari Ini — signals, dividers, no card grid */}
      <SectionTitle>Hari Ini</SectionTitle>
      <div>
        <Row>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-3 text-[13px] mb-1.5">
              <span className="text-ink font-medium">Minum air</span>
              <span className="text-muted vr-num">
                {(data.water.todayMl / 1000).toFixed(1)} / {(data.water.target / 1000).toFixed(1)} L
              </span>
            </div>
            <SignalBar value={waterPct} />
          </div>
          <button
            onClick={addWater}
            disabled={waterBusy}
            className="shrink-0 text-[11px] text-[color:var(--vr-accent)] border border-[color:var(--vr-accent)]/30 rounded-control px-2.5 py-1.5 font-medium transition-colors duration-[160ms] hover:bg-[color:var(--vr-accent)]/10 disabled:opacity-50"
          >
            + Gelas
          </button>
        </Row>
        <Row>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-3 text-[13px] mb-1.5">
              <span className="text-ink font-medium">Habit</span>
              <span className="text-muted vr-num">
                {data.habits.done}/{data.habits.total}
              </span>
            </div>
            <SignalBar value={data.habits.total ? data.habits.done / data.habits.total : 0} color="var(--vr-positive)" />
          </div>
          <Link href="/health" className="shrink-0 text-[11px] text-muted border border-lineSoft rounded-control px-2.5 py-1.5 font-medium transition-colors duration-[160ms] hover:bg-white/[0.04]">
            Buka
          </Link>
        </Row>
        <Row>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-3 text-[13px] mb-1.5">
              <span className="text-ink font-medium">Olahraga minggu ini</span>
              <span className="text-muted vr-num">
                {data.workout.weekCount}/{data.workout.target}
              </span>
            </div>
            <SignalBar value={data.workout.weekCount / Math.max(1, data.workout.target)} color="var(--vr-warning)" />
          </div>
          <Link href="/health" className="shrink-0 text-[11px] text-muted border border-lineSoft rounded-control px-2.5 py-1.5 font-medium transition-colors duration-[160ms] hover:bg-white/[0.04]">
            Log
          </Link>
        </Row>
      </div>

      {/* Tugas */}
      <SectionTitle action={<Link href="/tasks" className="text-xs text-[color:var(--vr-accent)] hover:text-[color:var(--vr-focus-ring)] transition-colors duration-[160ms]">Semua</Link>}>
        Tugas Sekolah
      </SectionTitle>
      {data.tasks.overdue > 0 && (
        <div className="border-l-2 border-[color:var(--vr-danger)] pl-3 py-1.5 mb-1">
          <span className="text-[color:var(--vr-danger)] text-[13px] font-medium">{data.tasks.overdue} tugas terlambat — segera kerjakan</span>
        </div>
      )}
      {data.tasks.next.length === 0 ? (
        <Empty>Tidak ada tugas aktif</Empty>
      ) : (
        <div>
          {data.tasks.next.slice(0, 3).map((t) => (
            <Row key={t.id}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink truncate">{t.title}</div>
                <div className="text-[11px] text-muted">
                  {t.deadline ? new Date(t.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Tanpa deadline"}
                </div>
              </div>
              <Chip tone={PRIORITY_TONE[t.priority] || "neutral"}>{t.priority}</Chip>
            </Row>
          ))}
        </div>
      )}

      {/* Jadwal hari ini */}
      <SectionTitle action={<Link href="/tasks" className="text-xs text-[color:var(--vr-accent)] hover:text-[color:var(--vr-focus-ring)] transition-colors duration-[160ms]">Kelola</Link>}>
        Jadwal Hari Ini
      </SectionTitle>
      {data.todayBlocks.length === 0 ? (
        <Empty>Tidak ada jadwal</Empty>
      ) : (
        <div>
          {data.todayBlocks.map((b) => (
            <Row key={b.id}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-[3px] h-8 rounded-full shrink-0" style={{ background: TYPE_ACCENT[b.type] || "var(--vr-text-muted)" }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{b.title}</div>
                  <div className="text-[11px] text-muted vr-num">
                    {hhmm(b.startMinute)} – {hhmm(b.endMinute)}
                  </div>
                </div>
              </div>
            </Row>
          ))}
        </div>
      )}

      {/* Uang hari ini — stat first, controls second */}
      <SectionTitle action={<Link href="/finance" className="text-xs text-[color:var(--vr-accent)] hover:text-[color:var(--vr-focus-ring)] transition-colors duration-[160ms]">Detail</Link>}>
        Uang Hari Ini
      </SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="vr-kicker">Masuk</p>
            <p className="text-lg text-[color:var(--vr-positive)] font-semibold vr-num mt-0.5">{idr(data.finance.todayIncome)}</p>
          </div>
          <div>
            <p className="vr-kicker">Keluar</p>
            <p className="text-lg text-[color:var(--vr-danger)] font-semibold vr-num mt-0.5">{idr(data.finance.todayExpense)}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-3">{data.finance.txCountToday} transaksi tercatat hari ini</p>
        <div className="mt-3 flex gap-2">
          <Link href="/finance" className="flex-1">
            <Btn variant="ghost" className="w-full !py-1.5 text-xs">Catat</Btn>
          </Link>
          <Link href="/whatif" className="flex-1">
            <Btn variant="ghost" className="w-full !py-1.5 text-xs">What-If</Btn>
          </Link>
        </div>
      </Card>

      {/* Goals */}
      {data.goals.length > 0 && (
        <>
          <SectionTitle>Target Tabungan</SectionTitle>
          <div>
            {data.goals.map((g) => (
              <Row key={g.id}>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3 items-baseline">
                    <span className="text-sm font-medium text-ink truncate">
                      {g.icon} {g.name}
                    </span>
                    <span className="text-xs text-muted vr-num">{Math.round(g.progress * 100)}%</span>
                  </div>
                  <SignalBar value={g.progress} color="var(--vr-primary)" className="mt-2" />
                  <div className="text-[10px] text-muted mt-1 vr-num">
                    {idr(g.currentAmount)} / {idr(g.targetAmount)}
                  </div>
                </div>
              </Row>
            ))}
          </div>
        </>
      )}

      {/* Skor keuangan */}
      {data.latestEval && (
        <>
          <SectionTitle>Skor Keuangan</SectionTitle>
          <Row>
            <div className="flex items-center gap-4">
              <div
                className="shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: data.latestEval.healthScore >= 75 ? "var(--vr-positive)" : data.latestEval.healthScore >= 50 ? "var(--vr-warning)" : "var(--vr-danger)" }}
              >
                <span className="text-sm font-semibold text-ink vr-num">{data.latestEval.healthScore}</span>
              </div>
              <p className="text-xs text-muted">Skor kesehatan keuangan terakhir.</p>
            </div>
            <Link href="/advisor" className="text-xs text-[color:var(--vr-accent)] font-medium hover:text-[color:var(--vr-focus-ring)] transition-colors duration-[160ms]">
              Buka
            </Link>
          </Row>
        </>
      )}
    </div>
  );
}
