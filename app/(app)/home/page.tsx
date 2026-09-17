"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, Droplets, Flame, Dumbbell, AlertTriangle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, Row, SectionTitle, SignalBar, Chip, Btn, Empty, Icon } from "@/components/ui";
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

const TYPE_COLOR: Record<string, string> = {
  SCHOOL: "var(--ui-text)",
  LESSON: "var(--ui-warning)",
  ACTIVITY: "var(--ui-positive)",
  PERSONAL: "var(--ui-text-muted)",
};
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
      <div className="fade-in space-y-4 pt-2" aria-hidden>
        <div className="h-9 w-52 rounded-control bg-black/[0.04] breathe" />
        <div className="h-20 rounded-card bg-black/[0.04] breathe" />
        <div className="h-40 rounded-card bg-black/[0.03] breathe" />
      </div>
    );
  }

  const waterPct = data.water.target > 0 ? data.water.todayMl / data.water.target : 0;
  const dateStr = new Date(data.today + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const hour = Math.floor(data.nowMinute / 60);
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div>
      {/* Header */}
      <header className="flex items-end justify-between gap-3 mb-6 pt-1 fade-rise">
        <div>
          <p className="kicker">{dateStr}</p>
          <h1 className="display mt-1">{greeting}, Fatih</h1>
        </div>
        <Link
          href="/profile"
          className="lift w-10 h-10 shrink-0 rounded-full bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] shadow-[var(--shadow-xs)] flex items-center justify-center text-[13px] font-semibold text-[color:var(--ui-text-soft)] mb-1"
          aria-label="Profil"
        >
          F
        </Link>
      </header>

      {/* Sekarang */}
      <Card className="mb-2 fade-rise lift" style={{ animationDelay: "40ms" }}>
        <div className="flex items-center gap-3">
          <span
            className="w-[3px] h-10 rounded-full shrink-0 transition-colors duration-500"
            style={{ background: data.currentBlock ? TYPE_COLOR[data.currentBlock.type] || "var(--ui-text-muted)" : "var(--ui-border-strong)" }}
          />
          <div className="min-w-0">
            <p className="kicker mb-1">Sekarang</p>
            {data.currentBlock ? (
              <>
                <div className="font-semibold text-[color:var(--ui-text)] truncate">{data.currentBlock.title}</div>
                <div className="text-xs text-[color:var(--ui-text-muted)] num">
                  {hhmm(data.currentBlock.startMinute)} – {hhmm(data.currentBlock.endMinute)}
                </div>
              </>
            ) : (
              <div className="text-sm text-[color:var(--ui-text-soft)] font-medium">
                {data.nextBlock ? `Bebas · ${data.nextBlock.title} @ ${hhmm(data.nextBlock.startMinute)}` : "Bebas / di luar jadwal"}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Hari Ini */}
      <SectionTitle>Hari Ini</SectionTitle>
      <div className="stagger-item" style={{ "--i": 2 } as React.CSSProperties}>
        <Row>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-8 h-8 rounded-[10px] bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] flex items-center justify-center text-[color:var(--ui-text-soft)] shrink-0">
              <Droplets size={15} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-3 text-[13px] mb-1.5">
                <span className="text-[color:var(--ui-text)] font-semibold">Minum air</span>
                <span className="text-[color:var(--ui-text-muted)] num">
                  {(data.water.todayMl / 1000).toFixed(1)} / {(data.water.target / 1000).toFixed(1)} L
                </span>
              </div>
              <SignalBar value={waterPct} color="var(--ui-primary)" />
            </div>
          </div>
          <button
            onClick={addWater}
            disabled={waterBusy}
            className="press shrink-0 inline-flex items-center gap-1 text-[11px] text-[color:var(--ui-text)] bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] rounded-control px-2.5 py-1.5 font-semibold shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-card)] transition-shadow duration-[180ms] disabled:opacity-50"
          >
            <Plus size={13} strokeWidth={2.25} aria-hidden /> Gelas
          </button>
        </Row>
        <Row>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-8 h-8 rounded-[10px] bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] flex items-center justify-center text-[color:var(--ui-text-soft)] shrink-0">
              <Flame size={15} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-3 text-[13px] mb-1.5">
                <span className="text-[color:var(--ui-text)] font-semibold">Habit</span>
                <span className="text-[color:var(--ui-text-muted)] num">
                  {data.habits.done}/{data.habits.total}
                </span>
              </div>
              <SignalBar value={data.habits.total ? data.habits.done / data.habits.total : 0} color="var(--ui-positive)" />
            </div>
          </div>
          <Link href="/health" className="press shrink-0 inline-flex items-center text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]" aria-label="Buka Kesehatan">
            <ChevronRight size={17} strokeWidth={2} aria-hidden />
          </Link>
        </Row>
        <Row>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-8 h-8 rounded-[10px] bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] flex items-center justify-center text-[color:var(--ui-text-soft)] shrink-0">
              <Dumbbell size={15} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-3 text-[13px] mb-1.5">
                <span className="text-[color:var(--ui-text)] font-semibold">Olahraga minggu ini</span>
                <span className="text-[color:var(--ui-text-muted)] num">
                  {data.workout.weekCount}/{data.workout.target}
                </span>
              </div>
              <SignalBar value={data.workout.weekCount / Math.max(1, data.workout.target)} color="var(--ui-warning)" />
            </div>
          </div>
          <Link href="/health" className="press shrink-0 inline-flex items-center text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]" aria-label="Buka Kesehatan">
            <ChevronRight size={17} strokeWidth={2} aria-hidden />
          </Link>
        </Row>
      </div>

      {/* Tugas */}
      <SectionTitle
        action={
          <Link href="/tasks" className="text-xs font-semibold text-[color:var(--ui-text-soft)] hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]">
            Semua
          </Link>
        }
      >
        Tugas Sekolah
      </SectionTitle>
      {data.tasks.overdue > 0 && (
        <div className="flex items-center gap-2 rounded-control bg-[color:var(--ui-danger-soft)] px-3 py-2 mb-1.5 fade-rise">
          <AlertTriangle size={14} strokeWidth={2} className="text-[color:var(--ui-danger)] shrink-0" aria-hidden />
          <span className="text-[color:var(--ui-danger)] text-[13px] font-semibold">{data.tasks.overdue} tugas terlambat — segera kerjakan</span>
        </div>
      )}
      {data.tasks.next.length === 0 ? (
        <Empty>Tidak ada tugas aktif</Empty>
      ) : (
        <div>
          {data.tasks.next.slice(0, 3).map((t, idx) => (
            <Row key={t.id} className="stagger-item" style={{ "--i": idx } as React.CSSProperties}>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[color:var(--ui-text)] truncate">{t.title}</div>
                <div className="text-[11px] text-[color:var(--ui-text-muted)]">
                  {t.deadline ? new Date(t.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Tanpa deadline"}
                </div>
              </div>
              <Chip tone={PRIORITY_TONE[t.priority] || "neutral"}>{t.priority}</Chip>
            </Row>
          ))}
        </div>
      )}

      {/* Jadwal */}
      <SectionTitle
        action={
          <Link href="/tasks" className="text-xs font-semibold text-[color:var(--ui-text-soft)] hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]">
            Kelola
          </Link>
        }
      >
        Jadwal Hari Ini
      </SectionTitle>
      {data.todayBlocks.length === 0 ? (
        <Empty>Tidak ada jadwal</Empty>
      ) : (
        <div>
          {data.todayBlocks.map((b, idx) => (
            <Row key={b.id} className="stagger-item" style={{ "--i": idx } as React.CSSProperties}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-[3px] h-8 rounded-full shrink-0" style={{ background: TYPE_COLOR[b.type] || "var(--ui-text-muted)" }} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--ui-text)] truncate">{b.title}</div>
                  <div className="text-[11px] text-[color:var(--ui-text-muted)] num">
                    {hhmm(b.startMinute)} – {hhmm(b.endMinute)}
                  </div>
                </div>
              </div>
            </Row>
          ))}
        </div>
      )}

      {/* Uang */}
      <SectionTitle
        action={
          <Link href="/finance" className="text-xs font-semibold text-[color:var(--ui-text-soft)] hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]">
            Detail
          </Link>
        }
      >
        Uang Hari Ini
      </SectionTitle>
      <Card className="stagger-item lift" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <span className="w-8 h-8 rounded-[10px] bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] flex items-center justify-center text-[color:var(--ui-text-soft)]">
            <Wallet size={15} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-[11px] text-[color:var(--ui-text-muted)]">{data.finance.txCountToday} transaksi hari ini</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="kicker flex items-center gap-1">
              <TrendingUp size={12} strokeWidth={2} className="text-[color:var(--ui-positive)]" aria-hidden /> Masuk
            </p>
            <p className="text-lg text-[color:var(--ui-positive)] font-bold num mt-0.5">{idr(data.finance.todayIncome)}</p>
          </div>
          <div>
            <p className="kicker flex items-center gap-1">
              <TrendingDown size={12} strokeWidth={2} className="text-[color:var(--ui-danger)]" aria-hidden /> Keluar
            </p>
            <p className="text-lg text-[color:var(--ui-danger)] font-bold num mt-0.5">{idr(data.finance.todayExpense)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/finance" className="flex-1">
            <Btn variant="ghost" className="w-full !py-2 text-xs">Catat</Btn>
          </Link>
          <Link href="/whatif" className="flex-1">
            <Btn variant="ghost" className="w-full !py-2 text-xs">What-If</Btn>
          </Link>
        </div>
      </Card>

      {/* Goals */}
      {data.goals.length > 0 && (
        <>
          <SectionTitle>Target Tabungan</SectionTitle>
          <div>
            {data.goals.map((g, idx) => (
              <Row key={g.id} className="stagger-item" style={{ "--i": idx } as React.CSSProperties}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-8 h-8 rounded-[10px] bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)] flex items-center justify-center text-[color:var(--ui-text-soft)] shrink-0">
                    <Icon name={g.icon} size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3 items-baseline mb-1.5">
                      <span className="text-sm font-semibold text-[color:var(--ui-text)] truncate">{g.name}</span>
                      <span className="text-xs text-[color:var(--ui-text-muted)] num">{Math.round(g.progress * 100)}%</span>
                    </div>
                    <SignalBar value={g.progress} color="var(--ui-primary)" />
                    <div className="text-[10px] text-[color:var(--ui-text-muted)] mt-1 num">
                      {idr(g.currentAmount)} / {idr(g.targetAmount)}
                    </div>
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
          <Row className="stagger-item">
            <div className="flex items-center gap-4">
              <div
                className="shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor:
                    data.latestEval.healthScore >= 75
                      ? "var(--ui-positive)"
                      : data.latestEval.healthScore >= 50
                        ? "var(--ui-warning)"
                        : "var(--ui-danger)",
                }}
              >
                <span className="text-sm font-bold text-[color:var(--ui-text)] num">{data.latestEval.healthScore}</span>
              </div>
              <p className="text-xs text-[color:var(--ui-text-muted)]">Skor kesehatan keuangan terakhir.</p>
            </div>
            <Link href="/advisor" className="text-xs font-semibold text-[color:var(--ui-text-soft)] hover:text-[color:var(--ui-text)] transition-colors duration-[180ms]">
              Buka
            </Link>
          </Row>
        </>
      )}
    </div>
  );
}