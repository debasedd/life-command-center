"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Card, Btn, Input, Select, Textarea, Sheet, SectionTitle, toast, api } from "@/components/ui";
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
const TYPE_ACCENT: Record<string, string> = { SCHOOL: "#7170ff", LESSON: "#f5a623", ACTIVITY: "#27a644", PERSONAL: "#62666d" };
const PRIORITY_DOT: Record<string, string> = { URGENT: "#eb5757", HIGH: "#f5a623", MEDIUM: "#7170ff", LOW: "#62666d" };

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
    <button onClick={onClick} className="p-1.5 text-[#62666d] hover:text-[#eb5757] transition-colors duration-150" aria-label="Hapus">
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

  // task form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [desc, setDesc] = useState("");
  const [recurring, setRecurring] = useState(false);

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

  async function addTask() {
    if (!title.trim()) return toast("Judul wajib diisi", "err");
    setBusy(true);
    try {
      await api("/api/tasks", { json: { title, subject: subject || null, priority, deadline: deadline || null, description: desc || null, recurring } });
      toast("Tugas ditambahkan");
      setSheet(null);
      setTitle(""); setSubject(""); setDeadline(""); setDesc(""); setRecurring(false);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", "err");
    } finally {
      setBusy(false);
    }
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
    <div className="animate-rise">
      <header className="flex items-center justify-between mb-4 pt-1">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">Akademik</h1>
        <div className="flex gap-1.5">
          <Btn variant="ghost" onClick={() => setAiSheet(true)} className="!py-1.5 !px-3 text-xs">Foto Tugas</Btn>
          <Btn onClick={() => setSheet(tab === "tasks" ? "task" : "block")} className="!py-1.5 !px-3 text-xs">
            {tab === "tasks" ? "Tugas" : "Jadwal"}
          </Btn>
        </div>
      </header>

      {/* Segmented control */}
      <div className="flex rounded-lg bg-white/[0.03] border border-white/[0.06] p-1 mb-4">
        {(["tasks", "schedule"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors duration-150 ${tab === t ? "bg-white/[0.08] text-[#f7f8f8]" : "text-[#8a8f98]"}`}
          >
            {t === "tasks" ? `Tugas${openCount ? ` · ${openCount}` : ""}` : "Jadwal"}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) =>
            items.length === 0 ? null : (
              <div key={group}>
                <SectionTitle>
                  {group}
                  <span className="ml-1.5 text-[#62666d]">{items.length}</span>
                </SectionTitle>
                <div className="space-y-1.5">
                  {items.map((t, idx) => (
                    <Card key={t.id} className={`stagger-item !py-2.5 ${t.status === "DONE" ? "opacity-45" : ""}`} style={{ "--i": idx } as React.CSSProperties}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggle(t)}
                          aria-label="Toggle selesai"
                          className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors duration-150 ${t.status === "DONE" ? "bg-[#27a644] border-[#27a644]" : "border-white/25 hover:border-white/50"}`}
                        >
                          {t.status === "DONE" && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium leading-snug ${t.status === "DONE" ? "line-through text-[#8a8f98]" : "text-[#f7f8f8]"}`}>{t.title}</div>
                          <div className="text-[11px] text-[#62666d] flex gap-2.5 flex-wrap mt-0.5">
                            {t.subject && <span>{t.subject}</span>}
                            {t.deadline && (
                              <span className={group === "Terlambat" ? "text-[#eb5757]" : ""}>
                                {fmtDeadline(t.deadline)}
                              </span>
                            )}
                            {t.recurring && <span>mingguan</span>}
                          </div>
                          {(t.aiStatus !== "NONE" || t.description) && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <AiStatusBadge status={t.aiStatus} />
                              {t.aiStatus === "DONE" && (
                                <button onClick={() => setAnswerTask(t)} className="text-[11px] text-[#7170ff] hover:text-[#828fff] font-medium transition-colors duration-150">
                                  Lihat pembahasan
                                </button>
                              )}
                              {t.aiStatus === "FAILED" && (
                                <button onClick={() => retryAi(t.id)} className="text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] font-medium transition-colors duration-150">
                                  Coba lagi
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="flex items-center gap-1 text-[10px] font-medium text-[#8a8f98]">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_DOT[t.priority] || "#62666d" }} />
                            {t.priority}
                          </span>
                          <Trash onClick={() => delTask(t.id)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          )}
          {tasks.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-[#62666d]">Belum ada tugas</p>
              <p className="text-[11px] text-[#4a4d52] mt-1">Tap tombol Tugas untuk menambah</p>
            </div>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-1.5">
          {blocks.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-[#62666d]">Belum ada jadwal</p>
              <p className="text-[11px] text-[#4a4d52] mt-1">Tap tombol Jadwal untuk menambah jadwal rutin</p>
            </div>
          )}
          {blocks
            .slice()
            .sort((a, b) => (a.weekday ?? 7) - (b.weekday ?? 7) || a.startMinute - b.startMinute)
            .map((b) => (
              <Card key={b.id} className="!py-2.5 !pl-3" >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: TYPE_ACCENT[b.type] || "#62666d" }} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#f7f8f8] truncate">{b.title}</div>
                      <div className="text-[11px] text-[#62666d]">
                        {b.weekday !== null ? `${DAYS[b.weekday]} · ` : b.date ? `${b.date} · ` : ""}
                        {minuteToHHMM(b.startMinute)}–{minuteToHHMM(b.endMinute)}
                        {b.location ? ` · ${b.location}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-[10px] text-[#62666d]">{TYPE_LABEL[b.type]}</span>
                    <Trash onClick={() => delBlock(b.id)} />
                  </div>
                </div>
              </Card>
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
              <label className="text-[11px] text-[#8a8f98] mb-1 block">Prioritas</label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-[#8a8f98] mb-1 block">Deadline</label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Catatan (opsional)" rows={2} />
          <label className="flex items-center gap-2 text-[13px] text-[#d0d6e0]">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-4 h-4 accent-[#5e6ad2]" />
            Berulang mingguan (auto-regenerate setelah selesai)
          </label>
          <Btn onClick={addTask} disabled={busy} className="w-full py-2.5">
            {busy ? "Menyimpan…" : "Simpan Tugas"}
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
              <label className="text-[11px] text-[#8a8f98] mb-1 block">Mulai</label>
              <Input type="time" value={bStart} onChange={(e) => setBStart(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-[#8a8f98] mb-1 block">Selesai</label>
              <Input type="time" value={bEnd} onChange={(e) => setBEnd(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#d0d6e0]">
            <input type="checkbox" checked={bRecurring} onChange={(e) => setBRecurring(e.target.checked)} className="w-4 h-4 accent-[#5e6ad2]" />
            Rutin mingguan
          </label>
          {bRecurring ? (
            <div>
              <label className="text-[11px] text-[#8a8f98] mb-1 block">Hari</label>
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
              <label className="text-[11px] text-[#8a8f98] mb-1 block">Tanggal (event sekali)</label>
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
