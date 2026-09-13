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

  const verdictStyle: Record<string, string> = {
    AMAN: "bg-emerald-500/20 text-emerald-300 border-emerald-800",
    "HATI-HATI": "bg-amber-500/20 text-amber-300 border-amber-800",
    BERISIKO: "bg-rose-500/20 text-rose-300 border-rose-800",
  };

  return (
    <div className="animate-rise">
      <h1 className="text-xl font-bold mb-1">🔮 What-If Simulator</h1>
      <p className="text-xs text-zinc-500 mb-4">Simulasi dampak pembelian terhadap target finansial — sebelum kamu menyesal.</p>

      <Card className="mb-4">
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Barang apa? mis: Sepatu Nike" />
          <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Rp)" className="!text-xl !py-3" />
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Metode</label>
            <div className="flex gap-2">
              <button onClick={() => setMonths(0)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${months === 0 ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>Cash lunas</button>
              <button onClick={() => setMonths(3)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${months === 3 ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>Cicil 3× </button>
              <button onClick={() => setMonths(6)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${months === 6 ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>Cicil 6×</button>
            </div>
          </div>
          <Btn onClick={simulate} disabled={busy} className="w-full py-3">{busy ? "Menghitung…" : "Simulasikan Dampak"}</Btn>
        </div>
      </Card>

      {result && (
        <div className="animate-rise space-y-3">
          <Card className={`border ${verdictStyle[result.verdict]}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{result.verdict === "AMAN" ? "🟢" : result.verdict === "HATI-HATI" ? "🟡" : "🔴"}</span>
              <div>
                <div className="text-lg font-bold">{result.verdict}</div>
                <div className="text-xs text-zinc-300">
                  {result.itemName} • {idr(result.price)}{result.installmentMonths > 0 ? ` (cicilan ${idr(result.price / result.installmentMonths)}/bln × ${result.installmentMonths})` : ""}
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {result.reasons.map((r, i) => (
                <li key={i} className="text-xs text-zinc-300 flex gap-2"><span>→</span>{r}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-xs font-bold text-zinc-300 mb-2">📊 Arus kas bulanan kamu</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-sm font-bold text-emerald-400">{idr(result.monthlyIncome)}</div><div className="text-[9px] text-zinc-500">masuk</div></div>
              <div><div className="text-sm font-bold text-rose-400">{idr(result.monthlyExpense)}</div><div className="text-[9px] text-zinc-500">keluar</div></div>
              <div><div className={`text-sm font-bold ${result.monthlySurplus >= 0 ? "text-sky-400" : "text-rose-500"}`}>{idr(result.monthlySurplus)}</div><div className="text-[9px] text-zinc-500">surplus</div></div>
            </div>
          </Card>

          {result.goalImpacts.length > 0 && (
            <>
              <SectionTitle>Dampak ke Target Tabungan</SectionTitle>
              {result.goalImpacts.map((g, i) => (
                <Card key={i} className="!py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{g.icon} {g.name}</div>
                      <div className="text-[11px] text-zinc-500">ritme nabung {idr(g.monthlyDeposit)}/bln • = {g.pctOfGoal}% dari target</div>
                    </div>
                    <div className="text-right">
                      {g.monthsDelayed !== null ? (
                        <div className={`text-sm font-bold ${(g.monthsDelayed || 0) > 3 ? "text-rose-400" : (g.monthsDelayed || 0) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          {g.monthsDelayed === 0 ? "tidak tertunda" : `+${g.monthsDelayed} bln`}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-600">belum ada ritme setoran</div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          <SectionTitle>Opportunity Cost</SectionTitle>
          <Card>
            <p className="text-sm">
              Kalau uang <b>{idr(result.price)}</b> ini diinvestasikan 10 tahun dengan return 8%/tahun:
            </p>
            <div className="text-center my-3">
              <div className="text-2xl font-bold text-indigo-300">{idr(result.opportunity10y)}</div>
              <div className="text-[10px] text-zinc-500">nilai masa depan (compound bulanan)</div>
            </div>
            <p className="text-[11px] text-zinc-500">Simulasi edukasi — bukan saran investasi. Return tidak dijamin.</p>
          </Card>
        </div>
      )}
    </div>
  );
}