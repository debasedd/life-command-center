"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Btn, Input, Select, Textarea, Sheet, SectionTitle, Row, Chip, toast, api } from "@/components/ui";
import { AiTaskSheet, AiStatusBadge, AiAnswerModal } from "@/components/ai-homework";
import { readCache, writeCache } from "@/lib/cache";

interface Task {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  priority: string;
  status: string;
  deadline: string | null;
  estimatedMinutes: number | null;
  recurring: boolean;
  aiStatus: string;
  aiAnswer: string | null;
  aiError: string | null;
  photoData: string | null;
  photoMime: string | null;
}

interface Block {
  id: string;
  title: string;
  type: string;
  startMinute: number;
  endMinute: number;
  weekday: number | null;
  date: string | null;
  location: string | null;
}

const DAYS = ["Mgg", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const TYPE_LABEL: Record<string, string> = { SCHOOL: "Sekolah", LESSON: "Les", ACTIVITY: "Kegiatan", PERSONAL: "Pribadi" };
const TYPE_ACCENT: Record<string, string> = { SCHOOL: "var(--ui-text)", LESSON: "var(--ui-warning)", ACTIVITY: "var(--ui-positive)", PERSONAL: "var(--ui-text-muted)" };
const PRIORITY_TONE: Record<string, "danger" | "warning" | "accent" | "neutral"> = { URGENT: "danger", HIGH: "warning", MEDIUM: "accent", LOW: "neutral" };
const PRIORITY_TONE_SOLID: Record<string, string> = { URGENT: "var(--ui-danger)", HIGH: "var(--ui-warning)", MEDIUM: "var(--ui-text)", LOW: "var(--ui-text-muted)" };

function minuteToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function fmtDeadline(s: string) {
  return new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function groupByDeadline(tasks: Task[]) {
  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const g: Record<string, Task[]> = { Terlambat: [], "Hari Ini": [], Besok: [], "Minggu Ini": [], Nanti: [], "Tanpa Deadline": [] };
  for (const t of tasks) {
    if (!t.deadline) {
      g["Tanpa Deadline"].push(t);
      continue;
    }
    const d = new Date(t.deadline).getTime();
    if (d < now) g["Terlambat"].push(t);
    else if (d <= todayEnd.getTime()) g["Hari Ini"].push(t);
    else if (d <= todayEnd.getTime() + 86400000) g["Besok"].push(t);
    else if (d <= todayEnd.getTime() + 7 * 86400000) g["Minggu Ini"].push(t);
    else g["Nanti"].push(t);
  }
  return g;
}

function Trash({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 text-muted hover:text-[color:var(--ui-danger)] transition-colors duration-[160ms]" aria-label="Hapus">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-3.5 h-3.5">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
    </button>
  );
}

export default function AcademicPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [tab, setTab] = useState<"tasks" | "schedule">("tasks");
  const [sheet, setSheet] = useState<"task" | "block" | null>(null);
  const [aiSheet, setAiSheet] = useState(false);
  const [answerTask, setAnswerTask] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // task form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [desc, setDesc] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [aiKerjakan, setAiKerjakan] = useState(false);

  // block form
  const [bTitle, setBTitle] = useState("");
  const [bType, setBType] = useState("SCHOOL");
  const [bStart, setBStart] = useState("07:00");
  const [bEnd, setBEnd] = useState("13:00");
  const [bWeekday, setBWeekday] = useState<string>("1");
  const [bRecurring, setBRecurring] = useState(true);
  const [bDate, setBDate] = useState("");

  async function load() {
    const [t, s] = await Promise.all([api<{ tasks: Task[] }>("/api/tasks"), api<{ blocks: Block[] }>("/api/schedule")]);
    writeCache("academic", { tasks: t.tasks, blocks: s.blocks });
    setTasks(t.tasks);
    setBlocks(s.blocks);
  }
  // Cache-first paint: hydrate from localStorage before first paint — no empty flash.
  useLayoutEffect(() => {
    const c = readCache<{ tasks: Task[]; blocks: Block[] }>("academic");
    if (c) {
      setTasks(c.tasks ?? []);
      setBlocks(c.blocks ?? []);
    }
  }, []);
  useEffect(() => {
    load();
  }, []);

  // Auto-heal: task dengan soal yang belum pernah dikerjakan AI (created sebelum
  // toggle ada) langsung dikirim ke AI sekali saat halaman dibuka; foto dari
  // shortcut yang belum diproses juga diproses di sini.
  useEffect(() => {
    if (!tasks.length) return;
    const orphans = tasks.filter((t) => t.description && t.aiStatus === "NONE");
    const photoPending = tasks.filter(
      (t) => t.photoData && !t.description && (t.aiStatus === "PENDING" || t.aiStatus === "FAILED")
    );
    if (orphans.length === 0 && photoPending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const t of orphans) {
        if (cancelled) return;
        await api("/api/tasks/ai-retry", { json: { id: t.id } }).catch(() => null);
      }
      for (const t of photoPending) {
        if (cancelled) return;
        await api("/api/tasks/ai-process", { json: { id: t.id } }).catch(() => null);
      }
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [tasks.length]);

  // Auto-poll: selama ada task yang masih diproses AI, refresh tiap 8 detik.
  useEffect(() => {
    if (!tasks.some((t) => t.aiStatus === "PENDING" || t.aiStatus === "PROCESSING")) return;
    const iv = setInterval(() => load(), 8000);
    return () => clearInterval(iv);
  }, [tasks]);

  async function addTask() {
    if (!title.trim()) return toast("Judul wajib diisi", "err");
    const created = await api<{ task: { id: string } }>("/api/tasks", {
      json: { title, subject: subject || null, priority, deadline: deadline || null, description: desc || null, recurring },
    }).catch(() => null);
    if (!created?.task?.id) return toast("Gagal membuat tugas", "err");

    // AI di background: jangan tunggu — kartu tugas menampilkan progress sendiri.
    if (aiKerjakan && desc.trim()) {
      toast("Tugas dibuat — AI mengerjakan di background");
      fetch("/api/tasks/ai-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: created.task.id }),
      }).then(() => load()).catch(() => {});
    } else {
      toast("Tugas ditambahkan");
    }

    setSheet(null);
    setTitle(""); setSubject(""); setDeadline(""); setDesc(""); setRecurring(false); setAiKerjakan(false);
    if (!(aiKerjakan && desc.trim())) await load();
  }

  async function addBlock() {
    if (!bTitle.trim()) return toast("Judul wajib diisi", "err");
    setBusy(true);
    try {
      await api("/api/schedule", {
        json: { title: bTitle, type: bType, startTime: bStart, endTime: bEnd, weekday: bRecurring ? Number(bWeekday) : null, date: bRecurring ? null : bDate || null },
      });
      toast("Jadwal ditambahkan");
      setSheet(null);
      setBTitle("");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", "err");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(t: Task) {
    const next = t.status === "DONE" ? "TODO" : "DONE";
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try {
      await api("/api/tasks", { method: "PATCH", json: { id: t.id, status: next } });
      if (next === "DONE") toast("Selesai");
      await load();
    } catch {
      toast("Gagal update", "err");
      await load();
    }
  }

  async function delTask(id: string) {
    await api(`/api/tasks?id=${id}`, { method: "DELETE" });
    toast("Tugas dihapus");
    await load();
  }

  async function delBlock(id: string) {
    await api(`/api/schedule?id=${id}`, { method: "DELETE" });
    toast("Jadwal dihapus");
    await load();
  }

  useEffect(() => {
    if (!answerTask || answerTask.aiStatus !== "PENDING") return;
    const t = setInterval(async () => {
      const res = await api<{ tasks: Task[] }>("/api/tasks");
      const fresh = res.tasks.find((x) => x.id === answerTask.id);
      if (fresh) setAnswerTask(fresh);
      setTasks(res.tasks);
    }, 5000);
    return () => clearInterval(t);
  }, [answerTask]);

  async function retryAi(id: string) {
    await api("/api/tasks/ai-retry", { json: { id } });
    toast("AI dikerjakan ulang");
    const res = await api<{ tasks: Task[] }>("/api/tasks");
    setTasks(res.tasks);
    setAnswerTask(res.tasks.find((x) => x.id === id) || null);
  }

  const grouped = groupByDeadline(tasks);
  const openCount = tasks.filter((t) => t.status !== "DONE").length;

  return (
    <div className="fade-rise">
      <header className="flex items-end justify-between gap-3 mb-5 pt-1">
        <div>
          <p className="kicker">Tugas & Jadwal</p>
          <h1 className="display mt-1">Akademik</h1>
        </div>
        <div className="flex gap-2 mb-1">
          <Btn variant="ghost" onClick={() => setAiSheet(true)} className="!py-1.5 !px-3 text-xs">Foto Tugas</Btn>
          <Btn onClick={() => setSheet(tab === "tasks" ? "task" : "block")} className="!py-1.5 !px-3 text-xs">
            {tab === "tasks" ? "Tugas" : "Jadwal"}
          </Btn>
        </div>
      </header>

      {/* Segmented control */}
      <div className="flex rounded-card border border-lineSoft p-1 mb-2">
        {(["tasks", "schedule"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`flex-1 rounded-control py-1.5 text-[13px] font-medium transition-colors duration-[160ms] ${tab === t ? "bg-black/[0.07] text-ink" : "text-muted"}`}
          >
            {t === "tasks" ? `Tugas${openCount ? ` · ${openCount}` : ""}` : "Jadwal"}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="space-y-5">
          {Object.entries(grouped).map(([group, items]) =>
            items.length === 0 ? null : (
              <div key={group}>
                <SectionTitle>
                  <span className={group === "Terlambat" ? "text-[color:var(--ui-danger)]" : ""}>
                    {group} <span className="text-muted normal-case tracking-normal">{items.length}</span>
                  </span>
                </SectionTitle>
                <div>
                  {items.map((t, idx) => (
                    <Row key={t.id} className={`stagger-item items-start ${t.status === "DONE" ? "opacity-45" : ""}`} >
                      <div className="flex items-start gap-3 flex-1 min-w-0" style={{ "--i": idx } as React.CSSProperties}>
                        <button
                          onClick={() => toggle(t)}
                          aria-label={t.status === "DONE" ? "Tandai belum selesai" : "Tandai selesai"}
                          aria-pressed={t.status === "DONE"}
                          className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors duration-[160ms] ${t.status === "DONE" ? "bg-[color:var(--ui-positive)] border-[color:var(--ui-positive)]" : "border-black/20 hover:border-black/40"}`}
                        >
                          {t.status === "DONE" && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ui-canvas)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                          <div className={`text-sm font-medium leading-snug ${t.status === "DONE" ? "line-through text-muted" : "text-ink"}`}>{t.title}</div>
                          <div className="text-[11px] text-muted flex gap-2.5 flex-wrap mt-0.5">
                            {t.subject && <span>{t.subject}</span>}
                            {t.deadline && <span className={group === "Terlambat" ? "text-[color:var(--ui-danger)]" : ""}>{fmtDeadline(t.deadline)}</span>}
                            {t.recurring && <span>mingguan</span>}
                          </div>
                          {expanded === t.id && (
                            <div className="mt-2 rounded-control bg-[color:var(--ui-surface)] border border-lineSoft p-2.5">
                              {t.description ? (
                                <p className="text-[12px] text-soft whitespace-pre-wrap leading-relaxed">{t.description}</p>
                              ) : (
                                <p className="text-[12px] text-muted">Tidak ada detail soal.</p>
                              )}
                              {t.estimatedMinutes != null && (
                                <p className="text-[10px] text-muted mt-1.5">Estimasi: {t.estimatedMinutes} menit</p>
                              )}
                            </div>
                          )}
                          {(t.aiStatus !== "NONE" || t.description) && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <AiStatusBadge status={t.aiStatus} />
                              {t.aiStatus === "PENDING" && (
                                <div className="h-0.5 w-16 rounded-full bg-black/[0.06] overflow-hidden">
                                  <div className="h-full w-1/3 bg-[color:var(--ui-text)] sweep" />
                                </div>
                              )}
                              {t.aiStatus === "DONE" && (
                                <button onClick={() => setAnswerTask(t)} className="text-[11px] text-[color:var(--ui-text)] hover:text-[color:var(--ui-focus-ring)] font-medium transition-colors duration-[160ms]">
                                  Lihat pembahasan
                                </button>
                              )}
                              {t.aiStatus === "FAILED" && (
                                <button onClick={() => retryAi(t.id)} className="text-[11px] text-muted hover:text-ink font-medium transition-colors duration-[160ms]">
                                  Coba lagi
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Chip tone={PRIORITY_TONE[t.priority] || "neutral"}>{t.priority}</Chip>
                          <Trash onClick={() => delTask(t.id)} />
                        </div>
                      </div>
                    </Row>
                  ))}
                </div>
              </div>
            )
          )}
          {tasks.length === 0 && (
            <div className="py-14">
              <p className="text-sm text-muted">Belum ada tugas</p>
              <p className="text-[11px] text-muted mt-1">Tap tombol Tugas untuk menambah</p>
            </div>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div>
          {blocks.length === 0 && (
            <div className="py-14">
              <p className="text-sm text-muted">Belum ada jadwal</p>
              <p className="text-[11px] text-muted mt-1">Tap tombol Jadwal untuk menambah jadwal rutin</p>
            </div>
          )}
          {blocks
            .slice()
            .sort((a, b) => (a.weekday ?? 7) - (b.weekday ?? 7) || a.startMinute - b.startMinute)
            .map((b) => (
              <Row key={b.id}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-[3px] h-9 rounded-full shrink-0" style={{ background: TYPE_ACCENT[b.type] || "var(--ui-text-muted)" }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{b.title}</div>
                    <div className="text-[11px] text-muted num">
                      {b.weekday !== null ? `${DAYS[b.weekday]} · ` : b.date ? `${b.date} · ` : ""}
                      {minuteToHHMM(b.startMinute)}–{minuteToHHMM(b.endMinute)}
                      {b.location ? ` · ${b.location}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className="text-[10px] text-muted">{TYPE_LABEL[b.type]}</span>
                  <Trash onClick={() => delBlock(b.id)} />
                </div>
              </Row>
            ))}
        </div>
      )}

      {/* Task sheet */}
      <Sheet open={sheet === "task"} onClose={() => setSheet(null)} title="Tugas Baru">
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul tugas, mis: Laporan Fisika" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mata pelajaran (opsional)" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="kicker mb-1 block">Prioritas</label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
            <div>
              <label className="kicker mb-1 block">Deadline</label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Soal / catatan — isi soal di sini untuk dikerjakan AI"
            rows={3}
          />
          <label className="flex items-center gap-2 text-[13px] text-soft">
            <input type="checkbox" checked={aiKerjakan} onChange={(e) => setAiKerjakan(e.target.checked)} className="w-4 h-4 accent-[color:var(--ui-primary)]" />
            Kerjakan dengan AI (butuh soal di atas, ± 30–50 detik)
          </label>
          <label className="flex items-center gap-2 text-[13px] text-soft">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-4 h-4 accent-[color:var(--ui-primary)]" />
            Berulang mingguan (auto-regenerate setelah selesai)
          </label>
          <Btn onClick={addTask} disabled={busy} className="w-full py-2.5">
            {busy ? (aiKerjakan ? "AI mengerjakan…" : "Menyimpan…") : aiKerjakan ? "Simpan + Kerjakan AI" : "Simpan Tugas"}
          </Btn>
        </div>
      </Sheet>

      {/* Block sheet */}
      <Sheet open={sheet === "block"} onClose={() => setSheet(null)} title="Jadwal Baru">
        <div className="space-y-3">
          <Input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="Judul, mis: Sekolah / Les Matematika" />
          <Select value={bType} onChange={(e) => setBType(e.target.value)}>
            <option value="SCHOOL">Sekolah</option>
            <option value="LESSON">Les</option>
            <option value="ACTIVITY">Kegiatan</option>
            <option value="PERSONAL">Pribadi</option>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="kicker mb-1 block">Mulai</label>
              <Input type="time" value={bStart} onChange={(e) => setBStart(e.target.value)} />
            </div>
            <div>
              <label className="kicker mb-1 block">Selesai</label>
              <Input type="time" value={bEnd} onChange={(e) => setBEnd(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-soft">
            <input type="checkbox" checked={bRecurring} onChange={(e) => setBRecurring(e.target.checked)} className="w-4 h-4 accent-[color:var(--ui-primary)]" />
            Rutin mingguan
          </label>
          {bRecurring ? (
            <div>
              <label className="kicker mb-1 block">Hari</label>
              <Select value={bWeekday} onChange={(e) => setBWeekday(e.target.value)}>
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label className="kicker mb-1 block">Tanggal (event sekali)</label>
              <Input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} />
            </div>
          )}
          <Btn onClick={addBlock} disabled={busy} className="w-full py-2.5">
            {busy ? "Menyimpan…" : "Simpan Jadwal"}
          </Btn>
        </div>
      </Sheet>

      <AiTaskSheet open={aiSheet} onClose={() => setAiSheet(false)} onCreated={load} />
      <AiAnswerModal task={answerTask} onClose={() => setAnswerTask(null)} onRetry={retryAi} />
    </div>
  );
}
