"use client";

import { useEffect, useState } from "react";
import { Card, Btn, SectionTitle, ProgressRing, toast, api } from "@/components/ui";

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
    setEvals(res.evaluations);
    if (res.evaluations.length) setExpanded(res.evaluations[0].id);
  }
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
  const scoreColor = (s: number) => (s >= 75 ? "#34d399" : s >= 50 ? "#fbbf24" : "#fb7185");

  return (
    <div className="animate-rise">
      <h1 className="text-xl font-bold mb-1">🤖 AI Financial Advisor</h1>
      <p className="text-xs text-zinc-500 mb-4">Evaluasi otomatis alokasi keuangan & tabungan kamu.</p>

      {latest && (
        <Card className="mb-4 flex items-center gap-4">
          <ProgressRing value={latest.healthScore / 100} size={80} stroke={8} color={scoreColor(latest.healthScore)}>
            <div className="text-center">
              <div className="text-xl font-bold">{latest.healthScore}</div>
              <div className="text-[9px] text-zinc-500">/100</div>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${latest.result.allocationVerdict === "SUDAH IDEAL" ? "bg-emerald-500/20 text-emerald-300" : latest.result.allocationVerdict === "PERLU PERBAIKAN" ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300"}`}>
              {latest.result.allocationVerdict}
            </span>
            <p className="text-[11px] text-zinc-400 mt-2">{latest.result.rationale}</p>
          </div>
        </Card>
      )}

      <Btn onClick={run} disabled={busy} className="w-full py-3 mb-4">
        {busy ? "🤖 Menganalisis…" : latest ? "🔄 Evaluasi Ulang Sekarang" : "🚀 Jalankan Evaluasi Pertama"}
      </Btn>

      {latest && (
        <>
          <SectionTitle>Temuan & Rekomendasi</SectionTitle>
          <Card className="mb-3">
            <p className="text-xs font-bold text-zinc-300 mb-2">📋 Diagnosis</p>
            <ul className="space-y-1.5">
              {latest.result.diagnosis.map((d, i) => (
                <li key={i} className="text-sm text-zinc-300 flex gap-2"><span className="text-amber-400">•</span>{d}</li>
              ))}
            </ul>
          </Card>
          <Card className="mb-3">
            <p className="text-xs font-bold text-zinc-300 mb-2">💡 Rekomendasi Aksi</p>
            <div className="space-y-3">
              {latest.result.recommendations.map((r, i) => (
                <div key={i} className="bg-zinc-800/60 rounded-xl p-3">
                  <p className="text-sm font-medium">{r.text}</p>
                  {r.impact && <p className="text-[11px] text-emerald-400 mt-1">📈 {r.impact}</p>}
                </div>
              ))}
            </div>
          </Card>
          <Card className="mb-3">
            <p className="text-xs font-bold text-zinc-300 mb-2">🧮 Komponen Skor</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Tabungan", latest.result.breakdown.savings, 40],
                ["Pencatatan", latest.result.breakdown.logging, 20],
                ["Kebutuhan", latest.result.breakdown.needsWants, 20],
                ["Goals", latest.result.breakdown.goals, 20],
              ].map(([label, val, max]) => (
                <div key={label as string}>
                  <div className="text-lg font-bold" style={{ color: scoreColor((val as number) / (max as number)) }}>{val as number}</div>
                  <div className="text-[9px] text-zinc-500">{label as string}<br />/{max as number}</div>
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
                <div key={e.id} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${Math.max(6, e.healthScore)}%`, background: scoreColor(e.healthScore), opacity: e.id === latest?.id ? 1 : 0.45 }}
                  />
                  <span className="text-[8px] text-zinc-600">{new Date(e.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!latest && !busy && (
        <Card className="text-sm text-zinc-500 text-center py-8">
          Belum ada evaluasi. Jalankan evaluasi pertama untuk melihat kesehatan keuangan kamu.
        </Card>
      )}
    </div>
  );
}