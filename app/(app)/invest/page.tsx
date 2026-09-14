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
  const totalPct = profile ? profile.assets.reduce((s, a) => s + a.pct, 0) : 0;

  return (
    <div className="animate-rise">
      <header className="mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">Proyeksi Portofolio</h1>
        <p className="text-xs text-[#8a8f98] mt-0.5">Simulasi compound growth jangka panjang. Edukasi — bukan saran investasi.</p>
      </header>

      <Card className="mb-3">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-[#8a8f98] mb-1 block">Investasi rutin bulanan (Rp)</label>
            <Input type="number" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="!text-base tabular-nums" />
            <div className="flex gap-1.5 mt-2">
              {[200000, 500000, 1000000, 2000000].map((v) => (
                <button key={v} onClick={() => setMonthly(String(v))} className="flex-1 rounded-md bg-white/[0.04] border border-white/[0.06] py-1.5 text-[11px] text-[#d0d6e0] card-press">{v / 1000}k</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#8a8f98] mb-1.5 block">Durasi: {years} tahun</label>
            <div className="flex gap-1.5">
              {[3, 5, 10, 20].map((y) => (
                <button key={y} onClick={() => setYears(y)} className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors duration-150 ${years === y ? "bg-[#5e6ad2] text-white" : "bg-white/[0.04] border border-white/[0.06] text-[#8a8f98]"}`}>{y} thn</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#8a8f98] mb-1.5 block">Skenario cepat</label>
            <div className="flex gap-2">
              {Object.keys(PRESETS).map((p) => (
                <button key={p} onClick={() => applyPreset(p)} className="flex-1 rounded-md bg-white/[0.04] border border-white/[0.06] py-2 text-[11px] font-medium text-[#d0d6e0] card-press">{p}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {profile && sim && (
        <>
          <Card className="mb-3">
            <p className="text-[10px] text-[#8a8f98] mb-3">Alokasi aset (porsi % & return/tahun)</p>
            <div className="space-y-3">
              {profile.assets.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-[#d0d6e0] truncate">{a.name}</div>
                    <div className="h-1 rounded-full bg-white/[0.05] mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-[#5e6ad2] transition-all duration-300" style={{ width: `${Math.min(100, a.pct)}%` }} />
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
                    className="!w-14 !py-1.5 !text-xs text-center tabular-nums"
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
                    className="!w-14 !py-1.5 !text-xs text-center tabular-nums"
                  />
                </div>
              ))}
            </div>
            <p className={`text-[10px] mt-2.5 ${totalPct > 100 ? "text-[#eb5757]" : "text-[#62666d]"}`}>
              Total alokasi: {totalPct}% (maks 100%)
            </p>
          </Card>

          <SectionTitle>Hasil Proyeksi ({years} tahun)</SectionTitle>
          <Card className="mb-3">
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div>
                <div className="text-sm font-semibold text-[#d0d6e0] tabular-nums">{idr(sim.finalPrincipal)}</div>
                <div className="text-[9px] text-[#62666d]">total modal</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#7170ff] tabular-nums">{idr(sim.finalTotal)}</div>
                <div className="text-[9px] text-[#62666d]">nilai akhir</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#27a644] tabular-nums">{idr(sim.finalTotal - sim.finalPrincipal)}</div>
                <div className="text-[9px] text-[#62666d]">uang kerja</div>
              </div>
            </div>

            {/* Bar chart per year */}
            <div className="flex items-end gap-1 h-36 mb-2">
              {sim.series.map((s) => (
                <div key={s.year} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div className="w-full rounded-t relative overflow-hidden" style={{ height: `${(s.total / maxTotal) * 100}%`, background: "rgba(255,255,255,0.08)" }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#5e6ad2] to-[#7170ff]" style={{ height: `${s.principal > 0 ? (s.principal / s.total) * 100 : 100}%` }} />
                  </div>
                  <span className="text-[8px] text-[#62666d]">{s.year}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 text-[9px] text-[#8a8f98] justify-center">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 bg-[#5e6ad2] rounded-[2px]" /> Modal</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 bg-white/[0.08] rounded-[2px]" /> Uang kerja</span>
            </div>
          </Card>

          <Card className="mb-3">
            <p className="text-[10px] text-[#8a8f98] mb-2">Per tahun</p>
            <div className="max-h-52 overflow-y-auto no-scrollbar">
              <table className="w-full text-[11px]">
                <thead className="text-[#62666d] sticky top-0 bg-[#191a1b]">
                  <tr><th className="text-left py-1.5 font-medium">Thn</th><th className="text-right font-medium">Modal</th><th className="text-right font-medium">Nilai</th><th className="text-right font-medium">Gain</th></tr>
                </thead>
                <tbody>
                  {sim.series.map((s) => (
                    <tr key={s.year} className="border-t border-white/[0.05]">
                      <td className="py-1.5 text-[#8a8f98]">{s.year}</td>
                      <td className="text-right text-[#8a8f98] tabular-nums">{idr(s.principal)}</td>
                      <td className="text-right text-[#f7f8f8] tabular-nums">{idr(s.total)}</td>
                      <td className="text-right text-[#27a644] tabular-nums">+{idr(s.total - s.principal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Btn onClick={save} disabled={saving} className="w-full py-2.5 mb-6">{saving ? "…" : "Simpan Profil Investasi"}</Btn>
        </>
      )}
    </div>
  );
}
