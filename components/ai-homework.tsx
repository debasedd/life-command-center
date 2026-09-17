"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet, Btn, Textarea, toast } from "@/components/ui";
import { X, Bot } from "lucide-react";

/** Foto soal → AI ekstrak & kerjakan. Hasil masuk daftar tugas otomatis. */
export function AiTaskSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<"photo" | "text">("photo");
  const [text, setText] = useState("");

  function pick(mode: "camera" | "gallery") {
    (mode === "camera" ? cameraRef : fileRef).current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast("Foto terlalu besar (maks 8MB)", "err");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function submit() {
    if (!preview) return;
    // AI di background: tutup sheet langsung, kartu menampilkan progress sendiri.
    toast("Foto dikirim — AI memproses di background");
    onClose();
    onCreated();

    fetch("/api/tasks/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo: preview }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.kind === "transaction") {
          const t = data.transaction;
          toast(`Tercatat: ${t.type === "INCOME" ? "Masuk" : "Keluar"} Rp${Number(t.amount).toLocaleString("id-ID")} · ${t.categoryName}`);
          window.location.assign("/finance");
        } else if (data.task?.aiStatus === "DONE") {
          toast("Pembahasan siap — buka di daftar tugas");
        } else if (data.error) {
          toast(data.error, "err");
        }
      })
      .catch(() => toast("Gagal memproses foto", "err"));
  }

  async function submitText() {
    if (text.trim().length < 3) return toast("Tulis soalnya dulu", "err");
    // AI di background: sheet tutup langsung, polling di daftar tugas menampilkan hasil.
    toast("Tugas dibuat — AI mengerjakan di background");
    setText("");
    onClose();
    onCreated();

    fetch("/api/tasks/ai-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.task?.aiStatus === "DONE") toast("Pembahasan siap — buka di daftar tugas");
        else if (data.error) toast(data.error, "err");
      })
      .catch(() => toast("Gagal memproses teks", "err"));
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tugas dari AI">
      <div className="flex rounded-md bg-black/[0.03] border border-lineSoft p-1 mb-3">
        {(["photo", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded py-1.5 text-[12px] font-medium transition-colors duration-[160ms] ${tab === t ? "bg-black/[0.07] text-ink" : "text-muted"}`}
          >
            {t === "photo" ? "Foto soal" : "Ketik manual"}
          </button>
        ))}
      </div>

      {tab === "photo" && (
        <>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

          {preview ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview soal" className="w-full rounded-lg border border-lineSoft max-h-72 object-contain bg-black/40" />
              <p className="text-[11px] text-muted text-center">Pastikan semua soal & angka terbaca jelas.</p>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => setPreview(null)} className="flex-1">Ulangi</Btn>
                <Btn onClick={submit} disabled={busy} className="flex-1">
                  {busy ? "AI membaca soal…" : "Kirim ke AI"}
                </Btn>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-sm text-soft leading-relaxed">
                Foto soal tugas. AI membaca soal, memasukkan ke daftar tugas, lalu mengerjakannya.
              </p>
              <Btn onClick={() => pick("camera")} className="w-full !py-3">Buka Kamera</Btn>
              <Btn variant="ghost" onClick={() => pick("gallery")} className="w-full !py-2.5">Pilih dari Galeri</Btn>
            </div>
          )}
        </>
      )}

      {tab === "text" && (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ketik atau tempel soal di sini, mis:&#10;Hitung integral dari 2x dx&#10;atau soal fisika lengkap"
            rows={7}
          />
          <p className="text-[11px] text-muted">AI mengerjakan soal & simpan pembahasannya ke tugas.</p>
          <Btn onClick={submitText} disabled={busy} className="w-full py-2.5">
            {busy ? "AI mengerjakan…" : "Kerjakan dengan AI"}
          </Btn>
        </div>
      )}
    </Sheet>
  );
}

/** Badge status AI di kartu tugas. */
export function AiStatusBadge({ status }: { status: string }) {
  if (status === "PENDING" || status === "PROCESSING") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-[color:var(--ui-text)] border border-[color:var(--ui-text)]/30 rounded-full px-2 py-0.5 font-medium">
        <span className="w-1 h-1 rounded-full bg-[color:var(--ui-text)] pulse" />
        AI mengerjakan
      </span>
    );
  }
  if (status === "DONE") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-[color:var(--ui-positive)] border border-[color:var(--ui-positive)]/30 rounded-full px-2 py-0.5 font-medium">
        <span className="w-1 h-1 rounded-full bg-[color:var(--ui-positive)]" />
        Pembahasan siap
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-[color:var(--ui-danger)] border border-[color:var(--ui-danger)]/30 rounded-full px-2 py-0.5 font-medium">
        <span className="w-1 h-1 rounded-full bg-[color:var(--ui-danger)]" />
        Gagal — coba lagi
      </span>
    );
  }
  return null;
}

/** Modal pembahasan AI — dibuka pas user senggang, tinggal disalin ke buku. */
export function AiAnswerModal({ task, onClose, onRetry }: { task: { id: string; title: string; aiAnswer: string | null; aiStatus: string; aiError: string | null } | null; onClose: () => void; onRetry: (id: string) => void }) {
  if (!task || typeof document === "undefined") return null;
  // Portal to body: page-root transform (animate-rise) breaks position:fixed inside.
  return (
    createPortal(
      <div className="fixed inset-0 z-50">
        <div className="sheet-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="modal-panel absolute inset-x-0 top-6 bottom-0 mx-auto max-w-md rounded-t-xl bg-[color:var(--ui-surface)] border-t border-lineSoft flex flex-col">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-lineSoft">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-black/12" />
            <h3 className="title-lg text-[17px] mt-1 truncate pr-2 text-ink">Pembahasan: {task.title}</h3>
            <button onClick={onClose} className="text-muted mt-1 p-2 -mr-2 hover:text-ink transition-colors duration-[180ms]" aria-label="Tutup">
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
            {task.aiStatus === "PENDING" && (
              <div className="text-center py-12 text-muted">
                <div className="flex justify-center mb-3 text-[color:var(--ui-text-soft)] breathe">
                  <Bot size={40} strokeWidth={1.5} />
                </div>
                AI sedang mengerjakan…<br />
                <span className="text-xs text-muted">Tinggalin dulu, balik lagi nanti. Hasilnya kesimpen.</span>
              </div>
            )}
            {task.aiStatus === "FAILED" && (
              <div className="text-center py-12">
                <p className="text-sm text-muted mb-4">{task.aiError || "AI gagal mengerjakan."}</p>
                <Btn onClick={() => onRetry(task.id)}>Coba Lagi</Btn>
              </div>
            )}
            {task.aiStatus === "DONE" && task.aiAnswer && <AnswerMarkdown text={task.aiAnswer} />}
          </div>
        </div>
      </div>,
      document.body
    )
  );
}

/** Renderer markdown sederhana (tanpa dependency): heading, bold, list, hr. */
function AnswerMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];

  function flushList() {
    if (listBuf.length) {
      out.push(
        <ul key={`ul${out.length}`} className="list-disc pl-5 space-y-1 my-2">
          {listBuf.map((li, i) => (
            <li key={i} className="text-sm">{inline(li)}</li>
          ))}
        </ul>
      );
      listBuf = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^###?\s/.test(line)) {
      flushList();
      out.push(<h4 key={out.length} className="font-bold text-[color:var(--ui-focus-ring)] mt-3 mb-1">{inline(line.replace(/^#+\s/, ""))}</h4>);
    } else if (/^##\s/.test(line)) {
      flushList();
      out.push(<h3 key={out.length} className="font-bold text-base mt-4 mb-1">{inline(line.replace(/^##\s/, ""))}</h3>);
    } else if (/^#/.test(line)) {
      flushList();
      out.push(<h3 key={out.length} className="font-bold text-lg mt-4 mb-1">{inline(line.replace(/^#\s/, ""))}</h3>);
    } else if (/^[-*]\s/.test(line)) {
      listBuf.push(line.replace(/^[-*]\s/, ""));
    } else if (/^---+$/.test(line)) {
      flushList();
      out.push(<hr key={out.length} className="border-lineSoft my-3" />);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(<p key={out.length} className="text-sm leading-relaxed my-1">{inline(line)}</p>);
    }
  }
  flushList();
  return <div>{out}</div>;
}

/** LaTeX + markup sisa AI → teks biasa yang bisa disalin ke buku. */
function plainMath(s: string): string {
  let out = s
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$\n]*?)\$/g, "$1")
    // desimal gaya LaTeX {,}07 / {.07} → bersihkan dulu, buka jalan untuk \mathbf dsb.
    .replace(/\{,\}/g, ",")
    .replace(/\{\.(\d+)\}/g, ".$1");
  for (let i = 0; i < 3; i++) {
    out = out.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, " $1/$2");
    out = out.replace(/\\(?:text|mathrm|mathbf|mathit|mathcal|bold)\s*\{([^{}]*)\}/g, "$1");
    out = out.replace(/\\(?:sqrt|radical)\s*\{([^{}]*)\}/g, "√($1)");
  }
  return out
    .replace(/\\approx|\\approxeq/g, "≈")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\leq|\\le/g, "≤")
    .replace(/\\geq|\\ge/g, "≥")
    .replace(/\\neq|\\ne/g, "≠")
    .replace(/\\pm/g, "±")
    .replace(/\\(left|right)/g, "")
    .replace(/\\%/g, "%")
    // pecahan: buang kurung mubazir angka/desimal (12)/(4) → 12/4
    .replace(/\((-?\d+(?:\.\d+)?)\)\/\((-?\d+(?:\.\d+)?)\)/g, "$1/$2")
    .replace(/\\quad|\\qquad|\\,/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function inline(text: string): React.ReactNode {
  // Bersihkan LaTeX sisa AI pakai plainMath, lalu pecah bold markdown
  let t = plainMath(text)
    .replace(/\\\((.+?)\\\)/g, "$1");
  const parts = t.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>
  );
}