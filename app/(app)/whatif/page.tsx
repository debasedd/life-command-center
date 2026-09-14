"use client";

import { useState } from "react";
import { Card, Btn, Input, SectionTitle, toast, api } from "@/components/ui";

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
  AMAN: { color: "text-[#27a644]", border: "border-[#27a644]/30", dot: "#27a644" },
  "HATI-HATI": { color: "text-[#f5a623]", border: "border-[#f5a623]/30", dot: "#f5a623" },
  BERISIKO: { color: "text-[#eb5757]", border: "border-[#eb5757]/30", dot: "#eb5757" },
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
      <header className="mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">What-If Simulator</h1>
        <p className="text-xs text-[#8a8f98] mt-0.5">Simulasi dampak pembelian ke target finansial — sebelum menyesal.</p>
      </header>

      <Card className="mb-4">
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Barang apa? mis: Sepatu Nike" />
          <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Rp)" className="!text-lg !py-3 tabular-nums" />
          <div>
            <label className="text-[11px] text-[#8a8f98] mb-1.5 block">Metode</label>
            <div className="flex gap-2">
              {([["Cash lunas", 0], ["Cicil 3×", 3], ["Cicil 6×", 6]] as [string, number][]).map(([label, m]) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-colors duration-150 ${months === m ? "bg-[#5e6ad2] text-white" : "bg-white/[0.03] border border-white/[0.08] text-[#8a8f98]"}`}
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
                <div className="text-base font-semibold text-[#f7f8f8]">{result.verdict}</div>
                <div className="text-[11px] text-[#8a8f98] tabular-nums">
                  {result.itemName} · {idr(result.price)}
                  {result.installmentMonths > 0 ? ` (cicilan ${idr(result.price / result.installmentMonths)}/bln × ${result.installmentMonths})` : ""}
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {result.reasons.map((r, i) => (
                <li key={i} className="text-xs text-[#d0d6e0] leading-relaxed flex gap-2">
                  <span className="text-[#62666d] shrink-0">—</span>{r}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-[10px] text-[#8a8f98] mb-2.5">Arus kas bulanan</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-semibold text-[#2fbd50] tabular-nums">{idr(result.monthlyIncome)}</div>
                <div className="text-[10px] text-[#62666d]">masuk</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#eb5757] tabular-nums">{idr(result.monthlyExpense)}</div>
                <div className="text-[10px] text-[#62666d]">keluar</div>
              </div>
              <div>
                <div className={`text-sm font-semibold tabular-nums ${result.monthlySurplus >= 0 ? "text-[#f7f8f8]" : "text-[#eb5757]"}`}>{idr(result.monthlySurplus)}</div>
                <div className="text-[10px] text-[#62666d]">surplus</div>
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
                      <div className="text-sm font-medium text-[#f7f8f8]">{g.icon} {g.name}</div>
                      <div className="text-[11px] text-[#62666d]">ritme nabung {idr(g.monthlyDeposit)}/bln · {g.pctOfGoal}% dari target</div>
                    </div>
                    <div className="text-right shrink-0">
                      {g.monthsDelayed !== null ? (
                        <div className={`text-sm font-semibold tabular-nums ${(g.monthsDelayed || 0) > 3 ? "text-[#eb5757]" : (g.monthsDelayed || 0) > 0 ? "text-[#f5a623]" : "text-[#27a644]"}`}>
                          {g.monthsDelayed === 0 ? "aman" : `+${g.monthsDelayed} bln`}
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#62666d]">belum ada ritme</div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          <SectionTitle>Opportunity Cost</SectionTitle>
          <Card>
            <p className="text-[13px] text-[#d0d6e0] leading-relaxed">
              Kalau <b className="text-[#f7f8f8]">{idr(result.price)}</b> diinvestasikan 10 tahun dengan return 8%/tahun:
            </p>
            <div className="text-center my-4">
              <div className="text-2xl font-semibold text-[#7170ff] tabular-nums">{idr(result.opportunity10y)}</div>
              <div className="text-[10px] text-[#62666d]">nilai masa depan (compound bulanan)</div>
            </div>
            <p className="text-[10px] text-[#4a4d52]">Simulasi edukasi — bukan saran investasi. Return tidak dijamin.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
