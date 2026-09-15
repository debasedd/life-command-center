"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet, Btn, toast } from "@/components/ui";

/** Foto soal → AI ekstrak & kerjakan. Hasil masuk daftar tugas otomatis. */
export function AiTaskSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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
    setBusy(true);
    try {
      const res = await fetch("/api/tasks/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses foto");
      toast("Tugas dibuat! 🤖 AI sedang mengerjakan…");
      setPreview(null);
      onClose();
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="📷 Foto Tugas">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {preview ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview soal" className="w-full rounded-2xl border border-zinc-800 max-h-72 object-contain bg-black/40" />
          <p className="text-[11px] text-zinc-400 text-center">Pastikan semua soal & angka terbaca jelas.</p>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setPreview(null)} className="flex-1">Ulangi</Btn>
            <Btn onClick={submit} disabled={busy} className="flex-1">
              {busy ? "🤖 AI membaca soal…" : "Kirim ke AI"}
            </Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-sm text-zinc-300">
            Foto soal tugas kamu. AI akan membaca soal, memasukkan ke daftar tugas, dan langsung mengerjakannya.
          </p>
          <Btn onClick={() => pick("camera")} className="w-full py-4 text-base">📸 Buka Kamera</Btn>
          <Btn variant="ghost" onClick={() => pick("gallery")} className="w-full py-3">🖼️ Pilih dari Galeri</Btn>
        </div>
      )}
    </Sheet>
  );
}

/** Badge status AI di kartu tugas. */
export function AiStatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold animate-pulse">🤖 AI mengerjakan…</span>;
  }
  if (status === "DONE") {
    return <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">🤖 Ada pembahasan</span>;
  }
  if (status === "FAILED") {
    return <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">🤖 Gagal — tap retry</span>;
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
        <div className="absolute inset-0 bg-black/85" onClick={onClose} />
        <div className="absolute inset-x-0 top-6 bottom-0 mx-auto max-w-md rounded-t-xl bg-[#191a1b] border-t border-white/[0.08] flex flex-col">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/[0.06]">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />
            <h3 className="text-sm font-semibold mt-1 truncate pr-2 text-[#f7f8f8]">Pembahasan: {task.title}</h3>
            <button onClick={onClose} className="text-[#8a8f98] mt-1 text-xl px-2 hover:text-[#f7f8f8] transition-colors duration-150">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
            {task.aiStatus === "PENDING" && (
              <div className="text-center py-12 text-[#8a8f98]">
                <div className="text-4xl mb-3 pulse">🤖</div>
                AI sedang mengerjakan…<br />
                <span className="text-xs text-[#62666d]">Tinggalin dulu, balik lagi nanti. Hasilnya kesimpen.</span>
              </div>
            )}
            {task.aiStatus === "FAILED" && (
              <div className="text-center py-12">
                <p className="text-sm text-[#8a8f98] mb-4">{task.aiError || "AI gagal mengerjakan."}</p>
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
      out.push(<h4 key={out.length} className="font-bold text-indigo-300 mt-3 mb-1">{inline(line.replace(/^#+\s/, ""))}</h4>);
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
      out.push(<hr key={out.length} className="border-zinc-800 my-3" />);
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

function inline(text: string): React.ReactNode {
  // Strip LaTeX $$..$$ & \frac yang dibuat model math jadi bentuk plain-text yang enak dibaca
  let t = text
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    .replace(/\\\((.+?)\\\)/g, "$1")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1 / $2")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\cdot/g, "·");
  const parts = t.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>
  );
}