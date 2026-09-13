/** AI Financial Advisor — rules-based engine (deterministic fallback) + LLM prompt builder.
 *  Produces health score 0-100 + diagnosis + recommendations + allocation verdict. */

export interface AdvisorInput {
  income30: number;
  expense30: number;
  byCategory: { name: string; total: number; pct: number }[];
  savingsRate: number;
  activeGoals: number;
  goalProgress: { name: string; progress: number }[];
  avgMonthlyDeposit: number;
  loggingDays: number;
  monthlyInvestment: number;
}

export interface AdvisorResult {
  healthScore: number;
  breakdown: { savings: number; logging: number; needsWants: number; goals: number };
  diagnosis: string[];
  recommendations: { text: string; impact: string }[];
  allocationVerdict: "SUDAH IDEAL" | "PERLU PERBAIKAN" | "BERISIKO";
  rationale: string;
}

const WANTS_CATS = ["Hiburan", "Makanan & Minuman"];

export function computeAdvisor(input: AdvisorInput): AdvisorResult {
  const diagnosis: string[] = [];
  const recommendations: { text: string; impact: string }[] = [];

  // 1) Savings rate (40 pts)
  const sr = input.savingsRate;
  let savingsPts: number;
  if (sr >= 0.3) savingsPts = 40;
  else if (sr >= 0.2) savingsPts = 32;
  else if (sr >= 0.1) savingsPts = 22;
  else if (sr >= 0.05) savingsPts = 12;
  else if (sr > 0) savingsPts = 5;
  else savingsPts = 0;

  if (sr < 0.2) {
    diagnosis.push(
      sr <= 0
        ? `Pengeluaran kamu (${fmt(input.expense30)}) ≥ pemasukan (${fmt(input.income30)}) — kamu defisit.`
        : `Savings rate kamu ${Math.round(sr * 100)}% — idealnya ≥ 20% untuk membangun fondasi.`
    );
    recommendations.push({
      text: "Tetapkan batas harian untuk jajan (misal Rp20.000/hari) dan catat sebelum beli.",
      impact: "Potensi naik savings rate ke 15-25% dalam sebulan",
    });
  } else {
    diagnosis.push(`Savings rate kamu ${Math.round(sr * 100)}% — sudah sehat. Pertahankan!`);
  }

  // 2) Logging consistency (20 pts)
  const logRatio = input.loggingDays / 30;
  const loggingPts = Math.round(logRatio * 20);
  if (logRatio < 0.5) {
    diagnosis.push(`Hanya ${input.loggingDays}/30 hari ada pencatatan — data evaluasi jadi kurang akurat.`);
    recommendations.push({ text: "Catat minimal 5 transaksi/hari selama seminggu (quick add ≤3 tap).", impact: "Skor akurasi evaluasi naik signifikan" });
  }

  // 3) Needs vs wants (20 pts)
  const wants = input.byCategory.filter((c) => WANTS_CATS.includes(c.name)).reduce((s, c) => s + c.total, 0);
  const wantsPct = input.expense30 > 0 ? wants / input.expense30 : 0;
  let needsPts: number;
  if (wantsPct <= 0.3) needsPts = 20;
  else if (wantsPct <= 0.45) needsPts = 14;
  else if (wantsPct <= 0.6) needsPts = 8;
  else needsPts = 3;
  if (wantsPct > 0.45) {
    const top = input.byCategory.filter((c) => WANTS_CATS.includes(c.name)).sort((a, b) => b.total - a.total)[0];
    diagnosis.push(`Pengeluaran "wants" (jajan + hiburan) ${Math.round(wantsPct * 100)}% dari total — agak tinggi.`);
    if (top) {
      const cut = Math.round(top.total * 0.3);
      recommendations.push({ text: `Kurangi kategori ${top.name} 30% (±${fmt(cut)}/bulan).`, impact: `Savings rate naik ~${Math.round((cut / Math.max(1, input.income30)) * 100)}%` });
    }
  }

  // 4) Goals (20 pts)
  let goalsPts = 0;
  if (input.activeGoals === 0) {
    diagnosis.push("Belum ada target tabungan aktif — uang tanpa tujuan mudah habis.");
    recommendations.push({ text: "Buat 1 savings goal konkret (mis. 'Beli Sepeda Rp2.500.000').", impact: "Alokasi uang jadi terarah" });
  } else {
    const avgProgress = input.goalProgress.reduce((s, g) => s + g.progress, 0) / input.goalProgress.length;
    const onTrack = input.goalProgress.filter((g) => g.progress > 0.1).length / input.goalProgress.length;
    goalsPts = Math.round((avgProgress * 0.6 + onTrack * 0.4) * 20);
    if (input.avgMonthlyDeposit === 0) {
      diagnosis.push("Goal aktif tapi belum ada setoran dalam 90 hari terakhir.");
      recommendations.push({ text: "Setor nominal kecil dulu (Rp20-50rb) — momentum lebih penting dari nominal.", impact: "Streak menabung mulai jalan" });
    }
  }

  const healthScore = Math.max(0, Math.min(100, Math.round(savingsPts + loggingPts + needsPts + goalsPts)));

  const verdict: AdvisorResult["allocationVerdict"] =
    healthScore >= 75 ? "SUDAH IDEAL" : healthScore >= 50 ? "PERLU PERBAIKAN" : "BERISIKO";
  const rationale =
    verdict === "SUDAH IDEAL"
      ? "Alokasi & kebiasaan nabung kamu sudah sehat. Fokus berikutnya: konsistensi & mulai investasi."
      : verdict === "PERLU PERBAIKAN"
        ? "Fondasi ada, tapi beberapa kebiasaan perlu dikoreksi sebelum menahun."
        : "Pola keuangan berisiko: defisit/tidak menabung. Prioritaskan membalik arus kas dulu.";

  if (input.monthlyInvestment === 0 && sr >= 0.2) {
    recommendations.push({ text: "Savings rate kamu sehat — mulai investasi rutin kecil (mis. Rp200rb/bln reksadana indeks).", impact: "Compound growth 10 tahun: uang kerja untuk kamu" });
  }

  return {
    healthScore,
    breakdown: { savings: savingsPts, logging: loggingPts, needsWants: needsPts, goals: goalsPts },
    diagnosis,
    recommendations,
    allocationVerdict: verdict,
    rationale,
  };
}

export function advisorPrompt(input: AdvisorInput): string {
  return `Data keuangan 30 hari terakhir user (pelajar Indonesia):
- Pemasukan: ${input.income30}
- Pengeluaran: ${input.expense30}
- Savings rate: ${Math.round(input.savingsRate * 100)}%
- Breakdown pengeluaran per kategori: ${input.byCategory.map((c) => `${c.name} ${c.pct}%`).join(", ") || "tidak ada"}
- Jumlah goal tabungan aktif: ${input.activeGoals}
- Progres goals: ${input.goalProgress.map((g) => `${g.name} ${Math.round(g.progress * 100)}%`).join(", ") || "-"}
- Rata-rata setoran bulanan: ${input.avgMonthlyDeposit}
- Konsistensi pencatatan: ${input.loggingDays}/30 hari

Evaluasi apakah alokasi keuangan & tabungan user sudah ideal. Balas HANYA JSON:
{"healthScore": <0-100>, "diagnosis": ["..."], "recommendations": [{"text": "...", "impact": "..."}], "allocationVerdict": "SUDAH IDEAL"|"PERLU PERBAIKAN"|"BERISIKO", "rationale": "..."}

Aturan: healthScore komponen = savings rate 40% + konsistensi catat 20% + rasio kebutuhan-vs-wants 20% + progres goals 20%. Rekomendasi harus spesifik dengan angka (bukan "hematlah uangmu"). Bahasa Indonesia santai.`;
}

export function parseAdvisorJson(text: string): {
  healthScore: number;
  diagnosis: string[];
  recommendations: { text: string; impact: string }[];
  allocationVerdict: string;
  rationale: string;
} | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof parsed.healthScore !== "number") return null;
    return {
      healthScore: Math.max(0, Math.min(100, Math.round(parsed.healthScore))),
      diagnosis: Array.isArray(parsed.diagnosis) ? parsed.diagnosis.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 6).map((r: { text?: unknown; impact?: unknown }) => ({ text: String(r.text || ""), impact: String(r.impact || "") }))
        : [],
      allocationVerdict: ["SUDAH IDEAL", "PERLU PERBAIKAN", "BERISIKO"].includes(parsed.allocationVerdict)
        ? parsed.allocationVerdict
        : "PERLU PERBAIKAN",
      rationale: String(parsed.rationale || ""),
    };
  } catch {
    return null;
  }
}

function fmt(n: number): string {
  return "Rp" + Number(n).toLocaleString("id-ID");
}