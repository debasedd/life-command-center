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
  const scoreColor = (s: number) => (s >= 75 ? "#27a644" : s >= 50 ? "#f5a623" : "#eb5757");
  const verdictColor = (v: string) =>
    v === "SUDAH IDEAL" ? "text-[#27a644] border-[#27a644]/30" : v === "PERLU PERBAIKAN" ? "text-[#f5a623] border-[#f5a623]/30" : "text-[#eb5757] border-[#eb5757]/30";

  return (
    <div className="animate-rise">
      <header className="mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">AI Financial Advisor</h1>
        <p className="text-xs text-[#8a8f98] mt-0.5">Evaluasi otomatis alokasi keuangan & tabungan.</p>
      </header>

      {latest && (
        <Card className="mb-3 flex items-center gap-4">
          <ProgressRing value={latest.healthScore / 100} size={80} stroke={8} color={scoreColor(latest.healthScore)}>
            <div className="text-center">
              <div className="text-xl font-semibold text-[#f7f8f8] tabular-nums">{latest.healthScore}</div>
              <div className="text-[9px] text-[#62666d]">/ 100</div>
            </div>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${verdictColor(latest.result.allocationVerdict)}`}>
              {latest.result.allocationVerdict}
            </span>
            <p className="text-[11px] text-[#8a8f98] mt-2 leading-relaxed">{latest.result.rationale}</p>
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
                <li key={i} className="text-[13px] text-[#d0d6e0] leading-relaxed flex gap-2.5">
                  <span className="text-[#f5a623] mt-0.5 shrink-0">•</span>{d}
                </li>
              ))}
            </ul>
          </Card>

          <SectionTitle>Rekomendasi Aksi</SectionTitle>
          <div className="space-y-1.5 mb-3">
            {latest.result.recommendations.map((r, i) => (
              <Card key={i} className="!py-3">
                <p className="text-[13px] font-medium text-[#f7f8f8] leading-snug">{r.text}</p>
                {r.impact && <p className="text-[11px] text-[#27a644] mt-1">{r.impact}</p>}
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
                  <div className="text-[9px] text-[#62666d]">{label}<br />/ {max}</div>
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
                  <span className="text-[8px] text-[#62666d]">{new Date(e.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!latest && !busy && (
        <div className="text-center py-14">
          <p className="text-sm text-[#62666d]">Belum ada evaluasi</p>
          <p className="text-[11px] text-[#4a4d52] mt-1">Jalankan evaluasi pertama untuk melihat kesehatan keuangan</p>
        </div>
      )}
    </div>
  );
}
