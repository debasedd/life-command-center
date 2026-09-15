"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Btn, Input, Textarea, toast, api } from "@/components/ui";

/**
 * Share target: iOS/Android share sheet → /share?title=..&text=..&url=..
 * Intent detection: money pattern → quick transaction; otherwise → task
 * (option "Kerjakan AI" uses the typed-text AI flow).
 */

function parseAmount(t: string): number | null {
  const s = t.toLowerCase();
  // "rp25.000" / "rp 25000" / "25rb" / "25k" / "2,5jt" / "1.5 juta" / plain "25000"
  const rp = s.match(/rp\s*([\d.,]+)/);
  const jt = s.match(/([\d.,]+)\s*(juta|jt)\b/);
  const rb = s.match(/([\d.,]+)\s*(rb|ribu|k)\b/);
  const plain = s.match(/(?:^|\s)(\d{4,9})(?:\s|$|[.,]\s)/);
  const num = (v: string) => Number(v.replace(/\./g, "").replace(/,/g, "."));
  try {
    if (jt) return Math.round(num(jt[1]) * 1_000_000);
    if (rb) return Math.round(num(rb[1]) * 1000);
    if (rp) {
      const v = num(rp[1]);
      if (v >= 100) return Math.round(v);
    }
    if (plain) return Number(plain[1]);
  } catch {}
  return null;
}

const INCOME_WORDS = ["gaji", "masuk", "terima", "dapat uang", "transfer masuk", "setoran", " THR", "bonus"];
const EXPENSE_WORDS = ["beli", "jajan", "bayar", "top up", "isi", "makan", "gojek", "grab", "kopi", "transport", "bensin"];

function detectType(t: string): "INCOME" | "EXPENSE" {
  const s = t.toLowerCase();
  if (INCOME_WORDS.some((w) => s.includes(w))) return "INCOME";
  return "EXPENSE";
}

function ShareInner() {
  const router = useRouter();
  const params = useSearchParams();
  const shared = useMemo(() => {
    const title = params.get("title") || "";
    const url = params.get("url") || "";
    const text = [params.get("text"), title && title !== params.get("text") ? title : "", url && !params.get("text") ? url : ""]
      .filter(Boolean)
      .join(" ")
      .trim();
    return text;
  }, [params]);

  const [mode, setMode] = useState<"tx" | "task" | null>(null);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!shared) return;
    const amt = parseAmount(shared);
    if (amt && amt >= 500) {
      setMode("tx");
      setType(detectType(shared));
      setAmount(String(amt));
      setNote(shared.replace(/rp\s*[\d.,]+/gi, "").replace(/\b\d+([.,]\d+)?\s*(juta|jt|rb|ribu|k)\b/gi, "").trim().slice(0, 120) || shared.slice(0, 120));
    } else {
      setMode("task");
      const firstLine = shared.split("\n").find((l) => l.trim()) || shared;
      setTaskTitle(firstLine.slice(0, 80));
      setDesc(shared);
    }
  }, [shared]);

  async function saveTx() {
    if (!amount || Number(amount) <= 0) return toast("Nominal harus lebih dari 0", "err");
    setBusy(true);
    try {
      await api("/api/transactions", { json: { type, amount: Number(amount), note: note || null } });
      toast("Transaksi dicatat");
      router.replace("/finance");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", "err");
      setBusy(false);
    }
  }

  async function saveTask(withAi: boolean) {
    if (!taskTitle.trim()) return toast("Judul wajib diisi", "err");
    setBusy(true);
    try {
      if (withAi) {
        await api("/api/tasks/ai-text", { json: { text: desc || taskTitle } });
        toast("AI sedang mengerjakan soal");
      } else {
        await api("/api/tasks", { json: { title: taskTitle, description: desc || null, priority: "MEDIUM" } });
        toast("Tugas ditambahkan");
      }
      router.replace("/tasks");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", "err");
      setBusy(false);
    }
  }

  const shortcutGuide = (
    <>
      <SectionTitle>Setup Shortcut iOS (sekali saja)</SectionTitle>
      <Card className="mb-3">
        <p className="text-[12px] text-[#8a8f98] leading-relaxed mb-3">
          iOS belum dukung share target web. Bikin Shortcut sekali, nanti tiap share dari app lain muncul opsi "Catat ke LifeCC".
        </p>
        <ol className="space-y-2 text-[12px] text-[#d0d6e0] leading-relaxed list-decimal pl-4">
          <li>Buka app <b className="text-[#f7f8f8]">Shortcuts</b> → tombol <b className="text-[#f7f8f8]">+</b></li>
          <li>Tap <b className="text-[#f7f8f8]">i</b> (info) → aktifkan <b className="text-[#f7f8f8]">Show in Share Sheet</b> → pilih tipe <b className="text-[#f7f8f8]">Text</b> & <b className="text-[#f7f8f8]">URL</b></li>
          <li>Tambah action <b className="text-[#f7f8f8]">Encode URL</b> → input: <b className="text-[#f7f8f8]">Shortcut Input</b></li>
          <li>Tambah action <b className="text-[#f7f8f8]">Text</b> → isi dengan template di bawah, ganti bagian akhir dengan hasil Encode URL</li>
          <li>Tambah action <b className="text-[#f7f8f8]">Open URLs</b> → pilih Text dari langkah 4</li>
          <li>Nama: <b className="text-[#f7f8f8]">Catat ke LifeCC</b> → Selesai</li>
        </ol>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 text-[10px] text-[#8a8f98] bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-2 break-all select-all">
            https://life-command-center-red.vercel.app/share?text=[Encode URL]
          </code>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText("https://life-command-center-red.vercel.app/share?text=");
                toast("Template URL disalin");
              } catch {
                toast("Gagal menyalin", "err");
              }
            }}
            className="shrink-0 text-[11px] text-[#7170ff] border border-[#7170ff]/30 rounded-md px-2.5 py-2 font-medium transition-colors duration-150 hover:bg-[#7170ff]/10"
          >
            Salin
          </button>
        </div>
        <p className="text-[10px] text-[#4a4d52] mt-2">
          Alternatif tanpa shortcut: buka LifeCC → menu Tangkap dari Share → tempel teks manual.
        </p>
      </Card>
    </>
  );

  if (!shared) {
    return (
      <div className="text-center py-10">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">Bagikan ke LifeCC</h1>
        <p className="text-sm text-[#8a8f98] mt-2 leading-relaxed px-4">
          Share teks atau catatan dari app lain ke "Life Command Center" untuk langsung dicatat.
        </p>
        <p className="text-[11px] text-[#4a4d52] mt-3">Wajib install ke Home Screen dulu (Share → Add to Home Screen).</p>
        <div className="text-left mt-4 px-4">{shortcutGuide}</div>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <header className="mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">Tangkap dari Share</h1>
        <p className="text-xs text-[#8a8f98] mt-0.5 truncate">"{shared.slice(0, 80)}{shared.length > 80 ? "…" : ""}"</p>
      </header>

      {/* Mode switch */}
      <div className="flex rounded-lg bg-white/[0.03] border border-white/[0.06] p-1 mb-3">
        {(["tx", "task"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors duration-150 ${mode === m ? "bg-white/[0.08] text-[#f7f8f8]" : "text-[#8a8f98]"}`}
          >
            {m === "tx" ? "Transaksi" : "Tugas"}
          </button>
        ))}
      </div>

      {mode === "tx" && (
        <Card>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setType("EXPENSE")} className={`rounded-md py-2.5 text-sm font-medium transition-colors duration-150 ${type === "EXPENSE" ? "bg-[#eb5757] text-white" : "bg-white/[0.03] border border-white/[0.08] text-[#8a8f98]"}`}>Keluar</button>
              <button onClick={() => setType("INCOME")} className={`rounded-md py-2.5 text-sm font-medium transition-colors duration-150 ${type === "INCOME" ? "bg-[#27a644] text-white" : "bg-white/[0.03] border border-white/[0.08] text-[#8a8f98]"}`}>Masuk</button>
            </div>
            <div>
              <label className="text-[11px] text-[#8a8f98] mb-1 block">Nominal (Rp)</label>
              <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="!text-lg !py-3 text-center tabular-nums" />
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan" rows={2} />
            <Btn onClick={saveTx} disabled={busy} className="w-full py-2.5">{busy ? "Menyimpan…" : "Simpan Transaksi"}</Btn>
          </div>
        </Card>
      )}

      {mode === "task" && (
        <Card>
          <div className="space-y-3">
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Judul tugas" />
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detail soal / catatan" rows={5} />
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => saveTask(false)} disabled={busy} className="flex-1 !py-2.5">Simpan saja</Btn>
              <Btn onClick={() => saveTask(true)} disabled={busy} className="flex-1 !py-2.5">{busy ? "…" : "Kerjakan AI"}</Btn>
            </div>
          </div>
        </Card>
      )}
      {/* iOS Shortcut setup guide */}
      <SectionTitle>Setup Shortcut iOS (sekali saja)</SectionTitle>
      <Card className="mb-3">
        <p className="text-[12px] text-[#8a8f98] leading-relaxed mb-3">
          iOS belum dukung share target web. Bikin Shortcut sekali, nanti tiap share dari app lain muncul opsi "Catat ke LifeCC".
        </p>
        <ol className="space-y-2 text-[12px] text-[#d0d6e0] leading-relaxed list-decimal pl-4">
          <li>Buka app <b className="text-[#f7f8f8]">Shortcuts</b> → tombol <b className="text-[#f7f8f8]">+</b></li>
          <li>Tap <b className="text-[#f7f8f8]">i</b> (info) → aktifkan <b className="text-[#f7f8f8]">Show in Share Sheet</b> → pilih tipe <b className="text-[#f7f8f8]">Text</b> & <b className="text-[#f7f8f8]">URL</b></li>
          <li>Tambah action <b className="text-[#f7f8f8]">Encode URL</b> → input: <b className="text-[#f7f8f8]">Shortcut Input</b></li>
          <li>Tambah action <b className="text-[#f7f8f8]">Text</b> → isi dengan template di bawah, ganti bagian akhir dengan hasil Encode URL</li>
          <li>Tambah action <b className="text-[#f7f8f8]">Open URLs</b> → pilih Text dari langkah 4</li>
          <li>Nama: <b className="text-[#f7f8f8]">Catat ke LifeCC</b> → Selesai</li>
        </ol>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 text-[10px] text-[#8a8f98] bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-2 break-all select-all">
            https://life-command-center-red.vercel.app/share?text=[Encode URL]
          </code>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText("https://life-command-center-red.vercel.app/share?text=");
                toast("Template URL disalin");
              } catch {
                toast("Gagal menyalin", "err");
              }
            }}
            className="shrink-0 text-[11px] text-[#7170ff] border border-[#7170ff]/30 rounded-md px-2.5 py-2 font-medium transition-colors duration-150 hover:bg-[#7170ff]/10"
          >
            Salin
          </button>
        </div>
        <p className="text-[10px] text-[#4a4d52] mt-2">
          Alternatif tanpa shortcut: buka LifeCC → menu Tangkap dari Share → tempel teks manual.
        </p>
      </Card>

      <p className="text-center text-[10px] text-[#4a4d52] pb-4">Hasil share tersimpan di Keuangan atau Akademik.</p>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-[#62666d]">Membuka…</div>}>
      <ShareInner />
    </Suspense>
  );
}
