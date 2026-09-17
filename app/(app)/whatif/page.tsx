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
  AMAN: { color: "text-[#609f89]", border: "border-[#609f89]/30", dot: "#609f89" },
  "HATI-HATI": { color: "text-[#eab38a]", border: "border-[#eab38a]/30", dot: "#eab38a" },
  BERISIKO: { color: "text-[#f87171]", border: "border-[#f87171]/30", dot: "#f87171" },
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
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#ffffff]">What-If Simulator</h1>
        <p className="text-xs text-[#868593] mt-0.5">Simulasi dampak pembelian ke target finansial — sebelum menyesal.</p>
      </header>

      <Card className="mb-4">
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Barang apa? mis: Sepatu Nike" />
          <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Rp)" className="!text-lg !py-3 tabular-nums" />
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Metode</label>
            <div className="flex gap-2">
              {([["Cash lunas", 0], ["Cicil 3×", 3], ["Cicil 6×", 6]] as [string, number][]).map(([label, m]) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-colors duration-150 ${months === m ? "bg-[#553f83] text-white" : "bg-white/[0.03] border border-white/[0.08] text-[#868593]"}`}
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
                <div className="text-base font-semibold text-[#ffffff]">{result.verdict}</div>
                <div className="text-[11px] text-[#868593] tabular-nums">
                  {result.itemName} · {idr(result.price)}
                  {result.installmentMonths > 0 ? ` (cicilan ${idr(result.price / result.installmentMonths)}/bln × ${result.installmentMonths})` : ""}
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {result.reasons.map((r, i) => (
                <li key={i} className="text-xs text-[#c4c4ca] leading-relaxed flex gap-2">
                  <span className="text-[#868593] shrink-0">—</span>{r}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-[10px] text-[#868593] mb-2.5">Arus kas bulanan</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-semibold text-[#72b39a] tabular-nums">{idr(result.monthlyIncome)}</div>
                <div className="text-[10px] text-[#868593]">masuk</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#f87171] tabular-nums">{idr(result.monthlyExpense)}</div>
                <div className="text-[10px] text-[#868593]">keluar</div>
              </div>
              <div>
                <div className={`text-sm font-semibold tabular-nums ${result.monthlySurplus >= 0 ? "text-[#ffffff]" : "text-[#f87171]"}`}>{idr(result.monthlySurplus)}</div>
                <div className="text-[10px] text-[#868593]">surplus</div>
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
                      <div className="text-sm font-medium text-[#ffffff]">{g.icon} {g.name}</div>
                      <div className="text-[11px] text-[#868593]">ritme nabung {idr(g.monthlyDeposit)}/bln · {g.pctOfGoal}% dari target</div>
                    </div>
                    <div className="text-right shrink-0">
                      {g.monthsDelayed !== null ? (
                        <div className={`text-sm font-semibold tabular-nums ${(g.monthsDelayed || 0) > 3 ? "text-[#f87171]" : (g.monthsDelayed || 0) > 0 ? "text-[#eab38a]" : "text-[#609f89]"}`}>
                          {g.monthsDelayed === 0 ? "aman" : `+${g.monthsDelayed} bln`}
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#868593]">belum ada ritme</div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          <SectionTitle>Opportunity Cost</SectionTitle>
          <Card>
            <p className="text-[13px] text-[#c4c4ca] leading-relaxed">
              Kalau <b className="text-[#ffffff]">{idr(result.price)}</b> diinvestasikan 10 tahun dengan return 8%/tahun:
            </p>
            <div className="text-center my-4">
              <div className="text-2xl font-semibold text-[#531aff] tabular-nums">{idr(result.opportunity10y)}</div>
              <div className="text-[10px] text-[#868593]">nilai masa depan (compound bulanan)</div>
            </div>
            <p className="text-[10px] text-[#868593]">Simulasi edukasi — bukan saran investasi. Return tidak dijamin.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
