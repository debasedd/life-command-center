"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet, Btn, Textarea, toast } from "@/components/ui";

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
    setBusy(true);
    try {
      const res = await fetch("/api/tasks/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses foto");
      if (data.task?.aiStatus === "DONE") toast("Pembahasan siap — buka di daftar tugas");
      else toast("Dibuat. AI gagal — tap Coba lagi di tugas", "err");
      setPreview(null);
      onClose();
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal", "err");
    } finally {
      setBusy(false);
    }
  }

  async function submitText() {
    if (text.trim().length < 3) return toast("Tulis soalnya dulu", "err");
    setBusy(true);
    try {
      const res = await fetch("/api/tasks/ai-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses teks");
      if (data.task?.aiStatus === "DONE") toast("Pembahasan siap — buka di daftar tugas");
      else toast("Dibuat. AI gagal — tap Coba lagi di tugas", "err");
      setText("");
      onClose();
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tugas dari AI">
      <div className="flex rounded-md bg-white/[0.03] border border-white/[0.06] p-1 mb-3">
        {(["photo", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded py-1.5 text-[12px] font-medium transition-colors duration-150 ${tab === t ? "bg-white/[0.08] text-[#f7f8f8]" : "text-[#8a8f98]"}`}
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
              <img src={preview} alt="preview soal" className="w-full rounded-lg border border-white/[0.08] max-h-72 object-contain bg-black/40" />
              <p className="text-[11px] text-[#8a8f98] text-center">Pastikan semua soal & angka terbaca jelas.</p>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => setPreview(null)} className="flex-1">Ulangi</Btn>
                <Btn onClick={submit} disabled={busy} className="flex-1">
                  {busy ? "AI membaca soal…" : "Kirim ke AI"}
                </Btn>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-sm text-[#d0d6e0] leading-relaxed">
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
          <p className="text-[11px] text-[#62666d]">AI mengerjakan soal & simpan pembahasannya ke tugas.</p>
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
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-[#7170ff] border border-[#7170ff]/30 rounded-full px-2 py-0.5 font-medium">
        <span className="w-1 h-1 rounded-full bg-[#7170ff] pulse" />
        AI mengerjakan
      </span>
    );
  }
  if (status === "DONE") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-[#27a644] border border-[#27a644]/30 rounded-full px-2 py-0.5 font-medium">
        <span className="w-1 h-1 rounded-full bg-[#27a644]" />
        Pembahasan siap
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-[#eb5757] border border-[#eb5757]/30 rounded-full px-2 py-0.5 font-medium">
        <span className="w-1 h-1 rounded-full bg-[#eb5757]" />
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