"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, Btn, Input, SectionTitle, toast, api } from "@/components/ui";

interface Asset { name: string; pct: number; rate: number }
interface Profile { monthlyInvestment: number; years: number; assets: Asset[] }

const PRESETS: Record<string, Asset[]> = {
  Konservatif: [
    { name: "Deposito", pct: 40, rate: 0.04 },
    { name: "Obligasi / RD Pendapatan Tetap", pct: 40, rate: 0.06 },
    { name: "Reksadana Saham / S&P500", pct: 10, rate: 0.1 },
    { name: "Emas", pct: 10, rate: 0.05 },
  ],
  Moderat: [
    { name: "Deposito", pct: 20, rate: 0.04 },
    { name: "Obligasi / RD Pendapatan Tetap", pct: 20, rate: 0.06 },
    { name: "Reksadana Saham / S&P500", pct: 40, rate: 0.1 },
    { name: "Emas", pct: 20, rate: 0.05 },
  ],
  Agresif: [
    { name: "Deposito", pct: 5, rate: 0.04 },
    { name: "Obligasi / RD Pendapatan Tetap", pct: 10, rate: 0.06 },
    { name: "Reksadana Saham / S&P500", pct: 70, rate: 0.11 },
    { name: "Emas", pct: 15, rate: 0.05 },
  ],
};

function idr(n: number) { return "Rp" + Math.round(n).toLocaleString("id-ID") }

/** Compound growth: monthly contributions split across assets, each compounding at its own rate. */
function project(monthly: number, assets: Asset[], years: number) {
  const months = years * 12;
  const balances = assets.map(() => 0);
  let totalPrincipal = 0;
  const series: { year: number; total: number; principal: number }[] = [];
  for (let m = 1; m <= months; m++) {
    for (let i = 0; i < assets.length; i++) {
      const alloc = (monthly * assets[i].pct) / 100;
      balances[i] = balances[i] * (1 + assets[i].rate / 12) + alloc;
    }
    totalPrincipal += monthly;
    if (m % 12 === 0) {
      series.push({ year: m / 12, total: balances.reduce((s, b) => s + b, 0), principal: totalPrincipal });
    }
  }
  return { series, finalTotal: balances.reduce((s, b) => s + b, 0), finalPrincipal: totalPrincipal };
}

export default function InvestPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [monthly, setMonthly] = useState("500000");
  const [years, setYears] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ profile: Profile }>("/api/invest").then((r) => {
      setProfile(r.profile);
      setMonthly(String(r.profile.monthlyInvestment));
      setYears(r.profile.years);
    }).catch(() => {});
  }, []);

  const sim = useMemo(() => {
    if (!profile) return null;
    return project(Number(monthly) || 0, profile.assets, years);
  }, [profile, monthly, years]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await api<{ profile: Profile }>("/api/invest", {
        method: "PATCH",
        json: { monthlyInvestment: Number(monthly) || 0, years, assets: profile.assets },
      });
      setProfile(res.profile);
      toast("Profil investasi disimpan");
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setSaving(false) }
  }

  async function applyPreset(name: string) {
    if (!profile) return;
    setProfile({ ...profile, assets: PRESETS[name] });
    toast(`Preset ${name} diterapkan — jangan lupa simpan`);
  }

  const maxTotal = sim ? Math.max(...sim.series.map((s) => s.total)) : 1;

  return (
    <div className="animate-rise">
      <h1 className="text-xl font-bold mb-1">📈 Proyeksi Portofolio</h1>
      <p className="text-xs text-zinc-500 mb-4">Simulasi compound growth jangka panjang. Simulasi edukasi — bukan saran investasi.</p>

      <Card className="mb-3">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Investasi rutin bulanan (Rp)</label>
            <Input type="number" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="!text-lg" />
            <div className="flex gap-1.5 mt-2">
              {[200000, 500000, 1000000, 2000000].map((v) => (
                <button key={v} onClick={() => setMonthly(String(v))} className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-[11px] text-zinc-300 active:scale-95">{v / 1000}k</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Durasi: {years} tahun</label>
            <div className="flex gap-1.5">
              {[3, 5, 10, 20].map((y) => (
                <button key={y} onClick={() => setYears(y)} className={`flex-1 rounded-lg py-2 text-xs font-bold ${years === y ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>{y} thn</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Skenario cepat</label>
            <div className="flex gap-2">
              {Object.keys(PRESETS).map((p) => (
                <button key={p} onClick={() => applyPreset(p)} className="flex-1 rounded-lg bg-zinc-800 py-2 text-[11px] font-semibold text-zinc-300 active:scale-95">{p}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {profile && sim && (
        <>
          <Card className="mb-3">
            <p className="text-xs font-bold text-zinc-300 mb-3">Alokasi aset (porsi % & return/tahun)</p>
            <div className="space-y-2.5">
              {profile.assets.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate">{a.name}</div>
                    <div className="h-1.5 rounded-full bg-zinc-800 mt-1">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${a.pct}%` }} />
                    </div>
                  </div>
                  <Input
                    type="number"
                    value={a.pct}
                    min={0}
                    max={100}
                    onChange={(e) => {
                      const assets = [...profile.assets];
                      assets[i] = { ...a, pct: Number(e.target.value) || 0 };
                      setProfile({ ...profile, assets });
                    }}
                    className="!w-16 !py-1.5 !text-xs text-center"
                  />
                  <Input
                    type="number"
                    step="0.5"
                    value={Math.round(a.rate * 1000) / 10}
                    onChange={(e) => {
                      const assets = [...profile.assets];
                      assets[i] = { ...a, rate: (Number(e.target.value) || 0) / 100 };
                      setProfile({ ...profile, assets });
                    }}
                    className="!w-16 !py-1.5 !text-xs text-center"
                  />
                </div>
              ))}
            </div>
            <p className={`text-[10px] mt-2 ${(profile.assets.reduce((s, a) => s + a.pct, 0)) > 100 ? "text-rose-400" : "text-zinc-600"}`}>
              Total alokasi: {profile.assets.reduce((s, a) => s + a.pct, 0)}% (maks 100%)
            </p>
          </Card>

          <SectionTitle>Hasil Proyeksi ({years} tahun)</SectionTitle>
          <Card className="mb-3">
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div>
                <div className="text-sm font-bold text-zinc-300">{idr(sim.finalPrincipal)}</div>
                <div className="text-[9px] text-zinc-500">total modal</div>
              </div>
              <div>
                <div className="text-sm font-bold text-indigo-300">{idr(sim.finalTotal)}</div>
                <div className="text-[9px] text-zinc-500">nilai akhir</div>
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-400">{idr(sim.finalTotal - sim.finalPrincipal)}</div>
                <div className="text-[9px] text-zinc-500">uang kerja (gain)</div>
              </div>
            </div>

            {/* Bar chart per year */}
            <div className="flex items-end gap-1 h-36 mb-2">
              {sim.series.map((s) => (
                <div key={s.year} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                  <div className="w-full rounded-t bg-zinc-700 relative" style={{ height: `${(s.total / maxTotal) * 100}%` }}>
                    <div className="absolute bottom-0 left-0 right-0 rounded-t bg-gradient-to-t from-indigo-600 to-indigo-400" style={{ height: `${s.principal > 0 ? (s.principal / s.total) * 100 : 100}%` }} />
                  </div>
                  <span className="text-[7px] text-zinc-600">{s.year}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 text-[9px] text-zinc-500 justify-center">
              <span><span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-sm align-middle" /> Modal</span>
              <span><span className="inline-block w-2.5 h-2.5 bg-zinc-700 rounded-sm align-middle" /> Uang kerja</span>
            </div>
          </Card>

          <Card className="mb-3">
            <p className="text-xs font-bold text-zinc-300 mb-2">Per tahun</p>
            <div className="max-h-52 overflow-y-auto no-scrollbar">
              <table className="w-full text-[11px]">
                <thead className="text-zinc-500 sticky top-0 bg-zinc-900">
                  <tr><th className="text-left py-1">Thn</th><th className="text-right">Modal</th><th className="text-right">Nilai</th><th className="text-right">Gain</th></tr>
                </thead>
                <tbody>
                  {sim.series.map((s) => (
                    <tr key={s.year} className="border-t border-zinc-800/60">
                      <td className="py-1">{s.year}</td>
                      <td className="text-right text-zinc-400">{idr(s.principal)}</td>
                      <td className="text-right font-medium">{idr(s.total)}</td>
                      <td className="text-right text-emerald-400">+{idr(s.total - s.principal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Btn onClick={save} disabled={saving} className="w-full py-3 mb-6">{saving ? "…" : "💾 Simpan Profil Investasi"}</Btn>
        </>
      )}
    </div>
  );
}