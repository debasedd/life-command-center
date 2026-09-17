"use client";

import { useEffect, useLayoutEffect, useState, useMemo } from "react";
import { Card, Btn, Input, Select, Sheet, SectionTitle, toast, api } from "@/components/ui";
import { wibToday } from "@/lib/wib";
import { readCache, writeCache } from "@/lib/cache";

interface Category { id: string; name: string; icon: string; color: string }
interface Tx { id: string; type: string; amount: number; note: string | null; day: string; categoryId: string; aiCategorized: boolean; category: Category }
interface Goal { id: string; name: string; icon: string; targetAmount: number; currentAmount: number; progress: number; avgMonthlyDeposit: number; monthsToFinish: number | null; status: string }

function idr(n: number) { return "Rp" + n.toLocaleString("id-ID") }

function Trash({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 text-[#868593] hover:text-[#f87171] transition-colors duration-150" aria-label="Hapus">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
    </button>
  );
}

export default function FinancePage() {
  const [tab, setTab] = useState<"ledger" | "goals">("ledger");
  const [cats, setCats] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [addSheet, setAddSheet] = useState(false);
  const [goalSheet, setGoalSheet] = useState(false);
  const [catSheet, setCatSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  // tx form
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [catId, setCatId] = useState("");
  const [day, setDay] = useState("");

  // goal form
  const [gName, setGName] = useState(""); const [gTarget, setGTarget] = useState(""); const [gIcon, setGIcon] = useState("🎯"); const [gDeadline, setGDeadline] = useState("");
  const [depGoal, setDepGoal] = useState<Goal | null>(null); const [depAmount, setDepAmount] = useState("");
  const [cName, setCName] = useState(""); const [cIcon, setCIcon] = useState("📦");

  // summary
  const [range, setRange] = useState<"today" | "week" | "month">("month");

  async function load() {
    const [c, t, g] = await Promise.all([
      api<{ categories: Category[] }>("/api/categories"),
      api<{ transactions: Tx[] }>("/api/transactions"),
      api<{ goals: Goal[] }>("/api/goals"),
    ]);
    writeCache("finance", { categories: c.categories, transactions: t.transactions, goals: g.goals });
    setCats(c.categories);
    setTxs(t.transactions);
    setGoals(g.goals);
  }
  // Cache-first paint
  useLayoutEffect(() => {
    const c = readCache<{ categories: Category[]; transactions: Tx[]; goals: Goal[] }>("finance");
    if (c) {
      setCats(c.categories ?? []);
      setTxs(c.transactions ?? []);
      setGoals(c.goals ?? []);
    }
  }, []);
  useEffect(() => { load() }, []);

  const aiHint = useMemo(() => {
    if (!note.trim() || type !== "EXPENSE") return null;
    const n = note.toLowerCase();
    const rules: [string, string[]][] = [
      ["Makan", ["nasi", "makan", "kopi", "cafe", "jajan", "bakso", "mie", "geprek"]],
      ["Transport", ["gojek", "grab", "ojek", "krl", "bus", "bensin"]],
      ["Sekolah", ["buku", "pulpen", "fotokopi", "print", "spm", "spp"]],
      ["Hiburan", ["game", "steam", "netflix", "spotify", "bioskop", "top up"]],
    ];
    for (const [cat, kws] of rules) if (kws.some((k) => n.includes(k))) return `AI akan deteksi kategori ${cat} otomatis saat simpan`;
    return "AI akan menebak kategori dari catatan ini";
  }, [note, type]);

  async function saveTx() {
    if (!amount || Number(amount) <= 0) return toast("Nominal harus lebih dari 0", "err");
    setBusy(true);
    try {
      const res = await api<{ transaction: Tx }>("/api/transactions", {
        json: { type, amount: Number(amount), note: note || null, categoryId: catId || undefined, day: day || undefined },
      });
      toast(`${type === "INCOME" ? "Pemasukan" : "Pengeluaran"} ${idr(res.transaction.amount)} dicatat${res.transaction.aiCategorized ? " · AI: " + res.transaction.category.name : ""}`);
      setAddSheet(false); setAmount(""); setNote(""); setCatId(""); setDay("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function changeCat(tx: Tx, newCatId: string) {
    await api("/api/transactions", { method: "PATCH", json: { id: tx.id, categoryId: newCatId } });
    toast("Kategori diubah — AI belajar dari koreksi ini");
    await load();
  }

  async function delTx(id: string) {
    await api(`/api/transactions?id=${id}`, { method: "DELETE" });
    toast("Transaksi dihapus");
    await load();
  }

  async function saveGoal() {
    if (!gName || !gTarget) return toast("Nama & target wajib diisi", "err");
    setBusy(true);
    try {
      await api("/api/goals", { json: { name: gName, targetAmount: Number(gTarget), icon: gIcon, deadline: gDeadline || null } });
      toast("Target tabungan dibuat");
      setGoalSheet(false); setGName(""); setGTarget(""); setGDeadline("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function deposit() {
    if (!depGoal || !depAmount) return;
    setBusy(true);
    try {
      await api("/api/goals", { method: "PATCH", json: { id: depGoal.id, action: "deposit", amount: Number(depAmount) } });
      toast(`Setoran ${idr(Number(depAmount))} masuk`);
      setDepGoal(null); setDepAmount("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function saveCat() {
    if (!cName.trim()) return toast("Nama kategori wajib diisi", "err");
    await api("/api/categories", { json: { name: cName, icon: cIcon } });
    toast("Kategori ditambahkan");
    setCatSheet(false); setCName("");
    await load();
  }

  const filtered = useMemo(() => {
    const today = wibToday();
    if (range === "today") return txs.filter((t) => t.day === today);
    const cut = new Date(today + "T00:00:00Z");
    cut.setUTCDate(cut.getUTCDate() - (range === "week" ? 7 : 30));
    const cutStr = cut.toISOString().slice(0, 10);
    return txs.filter((t) => t.day >= cutStr);
  }, [txs, range]);

  const income = filtered.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = filtered.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const byCat = useMemo(() => {
    const m = new Map<string, { cat: Category; total: number }>();
    for (const t of filtered.filter((t) => t.type === "EXPENSE")) {
      const cur = m.get(t.categoryId) || { cat: t.category, total: 0 };
      cur.total += t.amount;
      m.set(t.categoryId, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const groupedByDay = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of filtered) {
      if (!m.has(t.day)) m.set(t.day, []);
      m.get(t.day)!.push(t);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="animate-rise">
      <header className="flex items-center justify-between mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#ffffff]">Keuangan</h1>
        <div className="flex gap-1.5">
          <Btn variant="ghost" onClick={() => setCatSheet(true)} className="!py-1.5 !px-3 text-xs">Kategori</Btn>
          <Btn onClick={() => setAddSheet(true)} className="!py-1.5 !px-3 text-xs">Catat</Btn>
        </div>
      </header>

      {/* Segmented control */}
      <div className="flex rounded-lg bg-white/[0.03] border border-white/[0.06] p-1 mb-4">
        {(["ledger", "goals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors duration-150 ${tab === t ? "bg-white/[0.08] text-[#ffffff]" : "text-[#868593]"}`}
          >
            {t === "ledger" ? "Buku Kas" : `Target${goals?.some((g) => g.status === "ACTIVE") ? ` · ${goals.filter((g) => g.status === "ACTIVE").length}` : ""}`}
          </button>
        ))}
      </div>

      {tab === "ledger" && (
        <>
          <Card className="mb-3">
            <div className="flex gap-1 mb-3 rounded-md bg-white/[0.03] p-1">
              {(["today", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`flex-1 rounded py-1 text-[11px] font-medium transition-colors duration-150 ${range === r ? "bg-white/[0.08] text-[#ffffff]" : "text-[#868593]"}`}
                >
                  {r === "today" ? "Hari ini" : r === "week" ? "7 hari" : "30 hari"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <p className="text-lg font-semibold text-[#72b39a] tabular-nums">{idr(income)}</p>
                <p className="text-[10px] text-[#868593]">Masuk</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-[#f87171] tabular-nums">{idr(expense)}</p>
                <p className="text-[10px] text-[#868593]">Keluar</p>
              </div>
              <div>
                <p className={`text-lg font-semibold tabular-nums ${net >= 0 ? "text-[#ffffff]" : "text-[#f87171]"}`}>{idr(net)}</p>
                <p className="text-[10px] text-[#868593]">Selisih</p>
              </div>
            </div>
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] text-[#868593] mb-2">Pengeluaran per kategori</p>
              {byCat.length === 0 ? (
                <p className="text-xs text-[#868593]">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {byCat.slice(0, 6).map(({ cat, total }) => (
                    <div key={cat.id} className="flex items-center gap-2.5">
                      <span className="text-sm w-5 text-center shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#c4c4ca]">{cat.name}</span>
                          <span className="text-[#868593] tabular-nums">{idr(total)}</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${expense ? (total / expense) * 100 : 0}%`, background: cat.color || "#553f83" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <SectionTitle>Transaksi</SectionTitle>
          {groupedByDay.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-[#868593]">Belum ada transaksi di rentang ini</p>
            </div>
          )}
          {groupedByDay.map(([d, items]) => (
            <div key={d} className="mb-3">
              <p className="text-[11px] text-[#868593] mb-1.5">
                {new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-1.5">
                {items.map((tx, idx) => (
                  <Card key={tx.id} className="stagger-item !py-2.5 flex items-center gap-3" style={{ "--i": idx } as React.CSSProperties}>
                    <span className="text-lg w-7 text-center shrink-0">{tx.category?.icon ?? "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#ffffff] truncate">{tx.note || tx.category?.name || "Transaksi"}</div>
                      <div className="text-[10px] text-[#868593] flex items-center gap-1.5">
                        {tx.category?.name ?? "Tanpa kategori"}
                        {tx.aiCategorized && <span className="text-[9px] text-[#531aff] border border-[#531aff]/30 rounded px-1">AI</span>}
                        <Select
                          value={tx.categoryId}
                          onChange={(e) => changeCat(tx, e.target.value)}
                          className="!py-0 !px-1 !text-[10px] !bg-transparent !border-none !w-auto inline-block !text-[#868593]"
                        >
                          {cats.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1">
                      <div className={`text-sm font-semibold tabular-nums ${tx.type === "INCOME" ? "text-[#72b39a]" : "text-[#ffffff]"}`}>
                        {tx.type === "INCOME" ? "+" : "−"}{idr(tx.amount)}
                      </div>
                      <Trash onClick={() => delTx(tx.id)} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "goals" && (
        <>
          <Btn onClick={() => setGoalSheet(true)} variant="ghost" className="w-full mb-3">Target Baru</Btn>
          {goals.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-[#868593]">Belum ada target tabungan</p>
            </div>
          )}
          {goals.map((g) => (
            <Card key={g.id} className="mb-2">
              <div className="flex items-center justify-between mb-2.5">
                <div className="font-medium text-[#ffffff] flex items-center gap-2">
                  <span>{g.icon}</span> {g.name}
                </div>
                {g.status === "ACHIEVED" && <span className="text-[10px] text-[#609f89] border border-[#609f89]/30 rounded-full px-2 py-0.5 font-medium">Tercapai</span>}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-1.5">
                <div className="h-full bg-[#553f83] transition-all duration-300" style={{ width: `${Math.min(100, g.progress * 100)}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-[#868593] mb-2 tabular-nums">
                <span>{idr(g.currentAmount)} / {idr(g.targetAmount)}</span>
                <span>{Math.round(g.progress * 100)}%</span>
              </div>
              <div className="text-[11px] text-[#868593] mb-3">
                {g.monthsToFinish !== null
                  ? `Estimasi selesai ${g.monthsToFinish} bulan lagi · ritme ${idr(g.avgMonthlyDeposit)}/bln`
                  : "Belum ada ritme setoran — setor pertama untuk mulai forecast"}
              </div>
              <div className="flex gap-2">
                <Btn onClick={() => { setDepGoal(g); setDepAmount("") }} className="flex-1 !py-1.5 text-xs">Setor</Btn>
                <Btn variant="ghost" onClick={() => window.open(`/whatif?goal=${g.id}`, "_self")} className="flex-1 !py-1.5 text-xs">Simulasi</Btn>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Quick add sheet */}
      <Sheet open={addSheet} onClose={() => setAddSheet(false)} title="Catat Transaksi">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setType("EXPENSE")} className={`rounded-md py-2.5 font-medium text-sm transition-colors duration-150 ${type === "EXPENSE" ? "bg-[#f87171] text-white" : "bg-white/[0.03] border border-white/[0.08] text-[#868593]"}`}>Keluar</button>
            <button onClick={() => setType("INCOME")} className={`rounded-md py-2.5 font-medium text-sm transition-colors duration-150 ${type === "INCOME" ? "bg-[#609f89] text-white" : "bg-white/[0.03] border border-white/[0.08] text-[#868593]"}`}>Masuk</button>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1 block">Nominal (Rp)</label>
            <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" className="!text-xl !font-semibold !py-3 text-center tabular-nums" />
            <div className="flex gap-1.5 mt-2">
              {[5000, 10000, 20000, 50000, 100000].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-md bg-white/[0.04] border border-white/[0.06] py-1.5 text-[11px] text-[#c4c4ca] card-press">{v / 1000}k</button>
              ))}
            </div>
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan, mis: nasi padang / ojek ke sekolah" />
          {aiHint && <p className="text-[11px] text-[#531aff]">{aiHint}</p>}
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Kategori — kosongkan untuk AI pilih otomatis</label>
            <div className="grid grid-cols-4 gap-1.5">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCatId(catId === c.id ? "" : c.id)}
                  className={`rounded-md py-2 flex flex-col items-center gap-0.5 border transition-colors duration-150 ${catId === c.id ? "border-[#531aff] bg-[#531aff]/10" : "border-white/[0.08] bg-white/[0.02]"}`}
                >
                  <span className="text-base">{c.icon}</span>
                  <span className="text-[9px] text-[#868593] leading-tight text-center px-0.5">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1 block">Tanggal (opsional — default hari ini)</label>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <Btn onClick={saveTx} disabled={busy} className="w-full py-2.5">{busy ? "Menyimpan…" : "Simpan"}</Btn>
        </div>
      </Sheet>

      {/* Goal sheet */}
      <Sheet open={goalSheet} onClose={() => setGoalSheet(false)} title="Target Tabungan Baru">
        <div className="space-y-3">
          <Input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Nama, mis: Beli Sepeda" />
          <Input type="number" inputMode="numeric" value={gTarget} onChange={(e) => setGTarget(e.target.value)} placeholder="Target (Rp), mis: 2500000" />
          <div>
            <label className="text-[11px] text-[#868593] mb-1.5 block">Ikon</label>
            <div className="flex gap-2 flex-wrap">
              {["🎯", "🚲", "📱", "💻", "🛡️", "✈️", "🎓", "🏠"].map((i) => (
                <button key={i} onClick={() => setGIcon(i)} className={`w-11 h-11 rounded-md text-lg flex items-center justify-center border transition-colors duration-150 ${gIcon === i ? "border-[#531aff] bg-[#531aff]/10" : "border-white/[0.08] bg-white/[0.02]"}`}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#868593] mb-1 block">Deadline (opsional)</label>
            <Input type="date" value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} />
          </div>
          <Btn onClick={saveGoal} disabled={busy} className="w-full py-2.5">{busy ? "…" : "Buat Target"}</Btn>
        </div>
      </Sheet>

      {/* Deposit sheet */}
      <Sheet open={!!depGoal} onClose={() => setDepGoal(null)} title={`Setor ke ${depGoal?.name || ""}`}>
        <div className="space-y-3">
          <Input type="number" inputMode="numeric" value={depAmount} onChange={(e) => setDepAmount(e.target.value)} placeholder="Nominal setoran (Rp)" className="!text-lg !py-3 text-center tabular-nums" />
          <div className="flex gap-1.5">
            {[20000, 50000, 100000, 200000].map((v) => (
              <button key={v} onClick={() => setDepAmount(String(v))} className="flex-1 rounded-md bg-white/[0.04] border border-white/[0.06] py-2 text-[11px] text-[#c4c4ca] card-press">{v / 1000}k</button>
            ))}
          </div>
          <Btn onClick={deposit} disabled={busy} className="w-full py-2.5">{busy ? "…" : "Setor Sekarang"}</Btn>
        </div>
      </Sheet>

      {/* Category sheet */}
      <Sheet open={catSheet} onClose={() => setCatSheet(false)} title="Kategori">
        <div className="space-y-3">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2">
              <span className="text-sm text-[#c4c4ca]">{c.icon} {c.name}</span>
              <button
                onClick={async () => {
                  try {
                    await api(`/api/categories?id=${c.id}`, { method: "DELETE" });
                    toast("Kategori dihapus");
                    await load();
                  } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") }
                }}
                className="text-[#868593] hover:text-[#f87171] transition-colors duration-150 p-1"
                aria-label="Hapus kategori"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <Select value={cIcon} onChange={(e) => setCIcon(e.target.value)} className="!w-20">
              {["📦", "🍜", "🚌", "📚", "🎮", "💊", "🏦", "👕", "🎵", "⚽"].map((i) => <option key={i}>{i}</option>)}
            </Select>
            <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Kategori baru" />
            <Btn onClick={saveCat} className="!px-3">Tambah</Btn>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
