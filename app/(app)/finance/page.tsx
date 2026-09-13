"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, Btn, Input, Select, Sheet, SectionTitle, toast, api, toast as t2 } from "@/components/ui";

interface Category { id: string; name: string; icon: string; color: string }
interface Tx { id: string; type: string; amount: number; note: string | null; day: string; categoryId: string; aiCategorized: boolean; category: Category }
interface Goal { id: string; name: string; icon: string; targetAmount: number; currentAmount: number; progress: number; avgMonthlyDeposit: number; monthsToFinish: number | null; status: string }

function idr(n: number) { return "Rp" + n.toLocaleString("id-ID") }

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
  const [suggested, setSuggested] = useState<Category | null>(null);
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
    setCats(c.categories);
    setTxs(t.transactions);
    setGoals(g.goals);
  }
  useEffect(() => { load() }, []);

  // AI suggestion preview (rule-based client mirror is not available; server does it on save.
  // Preview is informational: show hint when note present.)
  const aiHint = useMemo(() => {
    if (!note.trim() || type !== "EXPENSE") return null;
    const n = note.toLowerCase();
    const rules: [string, string[]][] = [
      ["🍜", ["nasi", "makan", "kopi", "cafe", "jajan", "bakso", "mie", "geprek"]],
      ["🚌", ["gojek", "grab", "ojek", "krl", "bus", "bensin"]],
      ["📚", ["buku", "pulpen", "fotokopi", "print", "spm", "spp"]],
      ["🎮", ["game", "steam", "netflix", "spotify", "bioskop", "top up"]],
    ];
    for (const [icon, kws] of rules) if (kws.some((k) => n.includes(k))) return `${icon} AI mendeteksi kategori ini otomatis saat simpan`;
    return "🤖 AI akan menebak kategori dari catatan ini";
  }, [note, type]);

  async function saveTx() {
    if (!amount || Number(amount) <= 0) return toast("Nominal harus > 0", "err");
    setBusy(true);
    try {
      const res = await api<{ transaction: Tx }>("/api/transactions", {
        json: { type, amount: Number(amount), note: note || null, categoryId: catId || undefined, day: day || undefined },
      });
      toast(`${type === "INCOME" ? "Pemasukan" : "Pengeluaran"} ${idr(res.transaction.amount)} dicatat${res.transaction.aiCategorized ? " • AI kategori: " + res.transaction.category.name : ""}`);
      setAddSheet(false); setAmount(""); setNote(""); setCatId(""); setDay("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function changeCat(tx: Tx, newCatId: string) {
    await api("/api/transactions", { method: "PATCH", json: { id: tx.id, categoryId: newCatId } });
    toast("Kategori diubah — AI belajar dari koreksi ini 🧠");
    await load();
  }

  async function delTx(id: string) {
    await api(`/api/transactions?id=${id}`, { method: "DELETE" });
    toast("Transaksi dihapus");
    await load();
  }

  async function saveGoal() {
    if (!gName || !gTarget) return toast("Nama & target wajib", "err");
    setBusy(true);
    try {
      await api("/api/goals", { json: { name: gName, targetAmount: Number(gTarget), icon: gIcon, deadline: gDeadline || null } });
      toast("Target tabungan dibuat 🎯");
      setGoalSheet(false); setGName(""); setGTarget(""); setGDeadline("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function deposit() {
    if (!depGoal || !depAmount) return;
    setBusy(true);
    try {
      await api("/api/goals", { method: "PATCH", json: { id: depGoal.id, action: "deposit", amount: Number(depAmount) } });
      toast(`Setoran ${idr(Number(depAmount))} masuk 💰`);
      setDepGoal(null); setDepAmount("");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") } finally { setBusy(false) }
  }

  async function saveCat() {
    if (!cName.trim()) return toast("Nama wajib", "err");
    await api("/api/categories", { json: { name: cName, icon: cIcon } });
    toast("Kategori ditambah");
    setCatSheet(false); setCName("");
    await load();
  }

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (range === "today") cutoff.setHours(0, 0, 0);
    else if (range === "week") cutoff.setDate(now.getDate() - 7);
    else cutoff.setMonth(now.getMonth() - 1);
    const cut = cutoff.toISOString().slice(0, 10);
    return txs.filter((t) => t.day >= cut);
  }, [txs, range]);

  const income = filtered.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = filtered.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">💰 Keuangan</h1>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setCatSheet(true)} className="!py-2 !px-3 text-xs">🏷️</Btn>
          <Btn onClick={() => setAddSheet(true)} className="!py-2 !px-3 text-xs">＋ Catat</Btn>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("ledger")} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${tab === "ledger" ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>Ledger</button>
        <button onClick={() => setTab("goals")} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${tab === "goals" ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>Target ({goals.filter((g) => g.status === "ACTIVE").length})</button>
      </div>

      {tab === "ledger" && (
        <>
          <Card className="mb-3">
            <div className="flex gap-1 mb-3">
              {(["today", "week", "month"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${range === r ? "bg-zinc-700 text-white" : "text-zinc-500"}`}>
                  {r === "today" ? "Hari ini" : r === "week" ? "7 hari" : "30 hari"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Pemasukan</p>
                <p className="text-lg font-bold text-emerald-400">{idr(income)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Pengeluaran</p>
                <p className="text-lg font-bold text-rose-400">{idr(expense)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase mb-2">Per kategori</p>
              {byCat.length === 0 ? (
                <p className="text-xs text-zinc-600">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {byCat.slice(0, 6).map(({ cat, total }) => (
                    <div key={cat.id !== undefined ? `${cat.id}` : cat.name} className="flex items-center gap-2">
                      <span className="text-sm w-6">{cat.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span>{cat.name}</span>
                          <span className="text-zinc-400">{idr(total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800">
                          <div className="h-full rounded-full" style={{ width: `${expense ? (total / expense) * 100 : 0}%`, background: cat.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <SectionTitle>Histori Transaksi</SectionTitle>
          {groupedByDay.length === 0 && <Card className="text-sm text-zinc-500 text-center py-8">Belum ada transaksi di rentang ini.</Card>}
          {groupedByDay.map(([d, items]) => (
            <div key={d} className="mb-3">
              <p className="text-[11px] text-zinc-500 mb-1.5">{new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}</p>
              <div className="space-y-1.5">
                {items.map((tx) => (
                  <Card key={tx.id} className="!py-2.5 flex items-center gap-3">
                    <span className="text-xl w-7 text-center">{tx.category.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{tx.note || tx.category.name}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                        {tx.category.name}
                        {tx.aiCategorized && <span className="bg-indigo-500/20 text-indigo-300 px-1 rounded">AI</span>}
                        <Select
                          value={tx.categoryId}
                          onChange={(e) => changeCat(tx, e.target.value)}
                          className="!py-0 !px-1 !text-[10px] !bg-transparent !border-none !w-auto inline-block"
                        >
                          {cats.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${tx.type === "INCOME" ? "text-emerald-400" : "text-rose-400"}`}>
                        {tx.type === "INCOME" ? "+" : "−"}{idr(tx.amount)}
                      </div>
                      <button onClick={() => delTx(tx.id)} className="text-[10px] text-zinc-600">🗑</button>
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
          <Btn onClick={() => setGoalSheet(true)} className="w-full mb-3">＋ Target Baru</Btn>
          {goals.length === 0 && <Card className="text-sm text-zinc-500 text-center py-8">Belum ada target tabungan.</Card>}
          {goals.map((g) => (
            <Card key={g.id} className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{g.icon} {g.name}</div>
                {g.status === "ACHIEVED" ? <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">TERCAPAI 🎉</span> : null}
              </div>
              <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all" style={{ width: `${Math.min(100, g.progress * 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-zinc-400 mb-2">
                <span>{idr(g.currentAmount)} / {idr(g.targetAmount)}</span>
                <span>{Math.round(g.progress * 100)}%</span>
              </div>
              <div className="text-[11px] text-zinc-500 mb-3">
                {g.monthsToFinish !== null ? `⚡ Estimasi selesai: ${g.monthsToFinish} bulan lagi (ritme ${idr(g.avgMonthlyDeposit)}/bln)` : "Belum ada ritme setoran — setor pertama untuk mulai forecast"}
              </div>
              <div className="flex gap-2">
                <Btn onClick={() => { setDepGoal(g); setDepAmount("") }} className="flex-1 text-xs">💰 Setor</Btn>
                <Btn variant="ghost" onClick={() => window.open(`/whatif?goal=${g.id}`, "_self")} className="text-xs">🔮 Simulasi</Btn>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Quick add sheet */}
      <Sheet open={addSheet} onClose={() => setAddSheet(false)} title="Catat Transaksi">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setType("EXPENSE")} className={`rounded-xl py-3 font-bold text-sm ${type === "EXPENSE" ? "bg-rose-600" : "bg-zinc-800 text-zinc-400"}`}>− Keluar</button>
            <button onClick={() => setType("INCOME")} className={`rounded-xl py-3 font-bold text-sm ${type === "INCOME" ? "bg-emerald-600" : "bg-zinc-800 text-zinc-400"}`}>＋ Masuk</button>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nominal (Rp)</label>
            <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" className="!text-2xl !font-bold !py-4 text-center" />
            <div className="flex gap-1.5 mt-2">
              {[5000, 10000, 20000, 50000, 100000].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-[11px] text-zinc-300 active:scale-95">{v / 1000}k</button>
              ))}
            </div>
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan, mis: nasi padang / ojek ke sekolah" />
          {aiHint && <p className="text-[11px] text-indigo-300">{aiHint}</p>}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Kategori (kosongkan = AI pilih otomatis)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCatId(catId === c.id ? "" : c.id)}
                  className={`rounded-xl py-2 flex flex-col items-center gap-0.5 border ${catId === c.id ? "border-indigo-500 bg-indigo-500/15" : "border-zinc-800 bg-zinc-850"}`}
                >
                  <span>{c.icon}</span>
                  <span className="text-[9px] text-zinc-400 leading-tight text-center px-0.5">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tanggal (opsional — default hari ini)</label>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <Btn onClick={saveTx} disabled={busy} className="w-full py-3">{busy ? "Menyimpan…" : "Simpan"}</Btn>
        </div>
      </Sheet>

      {/* Goal sheet */}
      <Sheet open={goalSheet} onClose={() => setGoalSheet(false)} title="Target Tabungan Baru">
        <div className="space-y-3">
          <Input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Nama, mis: Beli Sepeda" />
          <Input type="number" inputMode="numeric" value={gTarget} onChange={(e) => setGTarget(e.target.value)} placeholder="Target (Rp), mis: 2500000" />
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Ikon</label>
            <div className="flex gap-2 flex-wrap">
              {["🎯", "🚲", "📱", "💻", "🛡️", "✈️", "🎓", "🏠"].map((i) => (
                <button key={i} onClick={() => setGIcon(i)} className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border ${gIcon === i ? "border-indigo-500 bg-indigo-500/15" : "border-zinc-800"}`}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Deadline (opsional)</label>
            <Input type="date" value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} />
          </div>
          <Btn onClick={saveGoal} disabled={busy} className="w-full py-3">{busy ? "…" : "Buat Target"}</Btn>
        </div>
      </Sheet>

      {/* Deposit sheet */}
      <Sheet open={!!depGoal} onClose={() => setDepGoal(null)} title={`Setor ke ${depGoal?.name || ""}`}>
        <div className="space-y-3">
          <Input type="number" inputMode="numeric" value={depAmount} onChange={(e) => setDepAmount(e.target.value)} placeholder="Nominal setoran (Rp)" className="!text-xl !py-3 text-center" />
          <div className="flex gap-1.5">
            {[20000, 50000, 100000, 200000].map((v) => (
              <button key={v} onClick={() => setDepAmount(String(v))} className="flex-1 rounded-lg bg-zinc-800 py-2 text-[11px] text-zinc-300 active:scale-95">{v / 1000}k</button>
            ))}
          </div>
          <Btn onClick={deposit} disabled={busy} className="w-full py-3">{busy ? "…" : "Setor Sekarang"}</Btn>
        </div>
      </Sheet>

      {/* Category sheet */}
      <Sheet open={catSheet} onClose={() => setCatSheet(false)} title="Kategori">
        <div className="space-y-3">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-zinc-800/60 rounded-xl px-3 py-2">
              <span className="text-sm">{c.icon} {c.name}</span>
              <button
                onClick={async () => {
                  try {
                    await api(`/api/categories?id=${c.id}`, { method: "DELETE" });
                    toast("Kategori dihapus");
                    await load();
                  } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "err") }
                }}
                className="text-[10px] text-zinc-600"
              >
                🗑
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <Select value={cIcon} onChange={(e) => setCIcon(e.target.value)} className="!w-20">
              {["📦", "🍜", "🚌", "📚", "🎮", "💊", "🏦", "👕", "🎵", "⚽"].map((i) => <option key={i}>{i}</option>)}
            </Select>
            <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Kategori baru" />
            <Btn onClick={saveCat} className="!px-3">＋</Btn>
          </div>
        </div>
      </Sheet>
    </div>
  );
}