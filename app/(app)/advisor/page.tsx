"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Card, Btn, SectionTitle, ProgressRing, toast, api } from "@/components/ui";
import { readCache, writeCache } from "@/lib/cache";

interface EvalResult {
  healthScore: number;
  breakdown: { savings: number; logging: number; needsWants: number; goals: number };
  diagnosis: string[];
  recommendations: { text: string; impact: string }[];
  allocationVerdict: string;
  rationale: string;
}
interface EvalRec { id: string; healthScore: number; result: EvalResult; createdAt: string }

export default function AdvisorPage() {
  const [evals, setEvals] = useState<EvalRec[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const res = await api<{ evaluations: EvalRec[] }>("/api/advisor");
    writeCache("advisor", res.evaluations);
    setEvals(res.evaluations);
    if (res.evaluations.length) setExpanded(res.evaluations[0].id);
  }
  // Cache-first paint
  useLayoutEffect(() => {
    const c = readCache<EvalRec[]>("advisor");
    if (c) setEvals(c);
  }, []);
  useEffect(() => { load() }, []);

  async function run() {
    setBusy(true);
    try {
      const res = await api<{ evaluation: EvalRec }>("/api/advisor", { json: {} });
      toast(`Evaluasi selesai — skor ${res.evaluation.healthScore}`);
      await load();
      setExpanded(res.evaluation.id);
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  const latest = evals.at(0);
  const scoreColor = (s: number) => (s >= 75 ? "var(--ui-positive)" : s >= 50 ? "var(--ui-warning)" : "var(--ui-danger)");
  const verdictColor = (v: string) =>
    v === "SUDAH IDEAL" ? "text-[color:var(--ui-positive)] border-[color:var(--ui-positive)]/30" : v === "PERLU PERBAIKAN" ? "text-[color:var(--ui-warning)] border-[color:var(--ui-warning)]/30" : "text-[color:var(--ui-danger)] border-[color:var(--ui-danger)]/30";

  return (
    <div className="fade-rise">
      <header className="mb-5 pt-1">
        <p className="kicker">Evaluasi Keuangan</p>
        <h1 className="display mt-1">AI Financial Advisor</h1>
        <p className="text-xs text-muted mt-1">Evaluasi otomatis alokasi keuangan & tabungan.</p>
      </header>

      {latest && (
        <Card className="mb-3 flex items-center gap-4">
          <ProgressRing value={latest.healthScore / 100} size={80} stroke={8} color={scoreColor(latest.healthScore)}>
            <div className="text-center">
              <div className="text-xl font-semibold text-ink tabular-nums">{latest.healthScore}</div>
              <div className="text-[9px] text-muted">/ 100</div>
            </div>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${verdictColor(latest.result.allocationVerdict)}`}>
              {latest.result.allocationVerdict}
            </span>
            <p className="text-[11px] text-muted mt-2 leading-relaxed">{latest.result.rationale}</p>
          </div>
        </Card>
      )}

      <Btn onClick={run} disabled={busy} className="w-full py-2.5 mb-3">
        {busy ? "Menganalisis…" : latest ? "Evaluasi Ulang" : "Jalankan Evaluasi Pertama"}
      </Btn>

      {latest && (
        <>
          <SectionTitle>Diagnosis</SectionTitle>
          <Card className="mb-3">
            <ul className="space-y-2">
              {latest.result.diagnosis.map((d, i) => (
                <li key={i} className="text-[13px] text-soft leading-relaxed flex gap-2.5">
                  <span className="text-[color:var(--ui-warning)] mt-0.5 shrink-0">•</span>{d}
                </li>
              ))}
            </ul>
          </Card>

          <SectionTitle>Rekomendasi Aksi</SectionTitle>
          <div className="space-y-1.5 mb-3">
            {latest.result.recommendations.map((r, i) => (
              <Card key={i} className="!py-3">
                <p className="text-[13px] font-medium text-ink leading-snug">{r.text}</p>
                {r.impact && <p className="text-[11px] text-[color:var(--ui-positive)] mt-1">{r.impact}</p>}
              </Card>
            ))}
          </div>

          <SectionTitle>Komponen Skor</SectionTitle>
          <Card className="mb-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              {([
                ["Tabungan", latest.result.breakdown.savings, 40],
                ["Pencatatan", latest.result.breakdown.logging, 20],
                ["Kebutuhan", latest.result.breakdown.needsWants, 20],
                ["Goals", latest.result.breakdown.goals, 20],
              ] as [string, number, number][]).map(([label, val, max]) => (
                <div key={label}>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: scoreColor((val / max) * 100) }}>{val}</div>
                  <div className="text-[9px] text-muted">{label}<br />/ {max}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {evals.length > 1 && (
        <>
          <SectionTitle>Riwayat Skor</SectionTitle>
          <Card>
            <div className="flex items-end gap-1.5 h-24">
              {evals.slice().reverse().map((e) => (
                <div key={e.id} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(6, e.healthScore)}%`, background: scoreColor(e.healthScore), opacity: e.id === latest?.id ? 1 : 0.35 }}
                  />
                  <span className="text-[8px] text-muted">{new Date(e.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!latest && !busy && (
        <div className="text-center py-14">
          <p className="text-sm text-muted">Belum ada evaluasi</p>
          <p className="text-[11px] text-muted mt-1">Jalankan evaluasi pertama untuk melihat kesehatan keuangan</p>
        </div>
      )}
    </div>
  );
}
