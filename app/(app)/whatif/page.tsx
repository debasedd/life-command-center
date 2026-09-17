"use client";

import { useState } from "react";
import { Card, Btn, Input, SectionTitle, toast, api, Icon } from "@/components/ui";

interface Result {
  itemName: string;
  price: number;
  installmentMonths: number;
  monthlySurplus: number;
  monthlyIncome: number;
  monthlyExpense: number;
  goalImpacts: { name: string; icon: string; monthlyDeposit: number; monthsDelayed: number | null; pctOfGoal: number }[];
  opportunity10y: number;
  verdict: string;
  reasons: string[];
  deficit: number;
}

function idr(n: number) { return "Rp" + Math.round(n).toLocaleString("id-ID") }

const VERDICT_META: Record<string, { color: string; border: string; dot: string }> = {
  AMAN: { color: "text-[color:var(--ui-positive)]", border: "border-[color:var(--ui-positive)]/30", dot: "#609f89" },
  "HATI-HATI": { color: "text-[color:var(--ui-warning)]", border: "border-[color:var(--ui-warning)]/30", dot: "#eab38a" },
  BERISIKO: { color: "text-[color:var(--ui-danger)]", border: "border-[color:var(--ui-danger)]/30", dot: "#f87171" },
};

export default function WhatIfPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [months, setMonths] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function simulate() {
    if (!price || Number(price) <= 0) return toast("Harga wajib diisi", "err");
    setBusy(true);
    try {
      const res = await api<Result>("/api/whatif", {
        json: { name: name || "Pembelian", price: Number(price), installmentMonths: months },
      });
      setResult(res);
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  const meta = result ? VERDICT_META[result.verdict] || VERDICT_META.AMAN : null;

  return (
    <div className="animate-rise">
      <header className="mb-5 pt-1">
        <p className="kicker">Simulasi</p>
        <h1 className="display mt-1">What-If Simulator</h1>
        <p className="text-xs text-muted mt-1">Simulasi dampak pembelian ke target finansial — sebelum menyesal.</p>
      </header>

      <Card className="mb-4">
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Barang apa? mis: Sepatu Nike" />
          <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Rp)" className="!text-lg !py-3 tabular-nums" />
          <div>
            <label className="text-[11px] text-muted mb-1.5 block">Metode</label>
            <div className="flex gap-2">
              {([["Cash lunas", 0], ["Cicil 3×", 3], ["Cicil 6×", 6]] as [string, number][]).map(([label, m]) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-colors duration-150 ${months === m ? "bg-[color:var(--ui-primary)] text-white" : "bg-black/[0.03] border border-lineSoft text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={simulate} disabled={busy} className="w-full py-2.5">{busy ? "Menghitung…" : "Simulasikan Dampak"}</Btn>
        </div>
      </Card>

      {result && meta && (
        <div className="animate-rise space-y-3">
          <Card className={`border ${meta.border}`}>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.dot }} />
              <div>
                <div className="text-base font-semibold text-ink">{result.verdict}</div>
                <div className="text-[11px] text-muted tabular-nums">
                  {result.itemName} · {idr(result.price)}
                  {result.installmentMonths > 0 ? ` (cicilan ${idr(result.price / result.installmentMonths)}/bln × ${result.installmentMonths})` : ""}
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {result.reasons.map((r, i) => (
                <li key={i} className="text-xs text-soft leading-relaxed flex gap-2">
                  <span className="text-muted shrink-0">—</span>{r}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-[10px] text-muted mb-2.5">Arus kas bulanan</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-semibold text-[color:var(--ui-positive)] tabular-nums">{idr(result.monthlyIncome)}</div>
                <div className="text-[10px] text-muted">masuk</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--ui-danger)] tabular-nums">{idr(result.monthlyExpense)}</div>
                <div className="text-[10px] text-muted">keluar</div>
              </div>
              <div>
                <div className={`text-sm font-semibold tabular-nums ${result.monthlySurplus >= 0 ? "text-ink" : "text-[color:var(--ui-danger)]"}`}>{idr(result.monthlySurplus)}</div>
                <div className="text-[10px] text-muted">surplus</div>
              </div>
            </div>
          </Card>

          {result.goalImpacts.length > 0 && (
            <>
              <SectionTitle>Dampak ke Target Tabungan</SectionTitle>
              {result.goalImpacts.map((g, i) => (
                <Card key={i} className="!py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-medium text-ink inline-flex items-center gap-2"><Icon name={g.icon} size={15} className="text-[color:var(--ui-text-soft)]" /> {g.name}</div>
                      <div className="text-[11px] text-muted">ritme nabung {idr(g.monthlyDeposit)}/bln · {g.pctOfGoal}% dari target</div>
                    </div>
                    <div className="text-right shrink-0">
                      {g.monthsDelayed !== null ? (
                        <div className={`text-sm font-semibold tabular-nums ${(g.monthsDelayed || 0) > 3 ? "text-[color:var(--ui-danger)]" : (g.monthsDelayed || 0) > 0 ? "text-[color:var(--ui-warning)]" : "text-[color:var(--ui-positive)]"}`}>
                          {g.monthsDelayed === 0 ? "aman" : `+${g.monthsDelayed} bln`}
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted">belum ada ritme</div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          <SectionTitle>Opportunity Cost</SectionTitle>
          <Card>
            <p className="text-[13px] text-soft leading-relaxed">
              Kalau <b className="text-ink">{idr(result.price)}</b> diinvestasikan 10 tahun dengan return 8%/tahun:
            </p>
            <div className="text-center my-4">
              <div className="text-2xl font-semibold text-[color:var(--ui-text)] tabular-nums">{idr(result.opportunity10y)}</div>
              <div className="text-[10px] text-muted">nilai masa depan (compound bulanan)</div>
            </div>
            <p className="text-[10px] text-muted">Simulasi edukasi — bukan saran investasi. Return tidak dijamin.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
