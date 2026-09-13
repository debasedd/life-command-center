"use client";

import { useEffect, useState } from "react";
import { Card, Btn, Input, Select, Textarea, Sheet, SectionTitle, toast, api } from "@/components/ui";
import { AiTaskSheet, AiStatusBadge, AiAnswerModal } from "@/components/ai-homework";

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
const TYPE_COLOR: Record<string, string> = {
  SCHOOL: "border-l-indigo-500 bg-indigo-500/10",
  LESSON: "border-l-amber-500 bg-amber-500/10",
  ACTIVITY: "border-l-emerald-500 bg-emerald-500/10",
  PERSONAL: "border-l-zinc-500 bg-zinc-500/10",
};

function minuteToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
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
    setTasks(t.tasks);
    setBlocks(s.blocks);
  }
  useEffect(() => {
    load();
  }, []);

  async function addTask() {
    if (!title.trim()) return toast("Judul wajib", "err");
    setBusy(true);
    try {
      await api("/api/tasks", { json: { title, subject: subject || null, priority, deadline: deadline || null, description: desc || null, recurring } });
      toast("Tugas ditambahkan ✅");
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
    if (!bTitle.trim()) return toast("Judul wajib", "err");
    setBusy(true);
    try {
      await api("/api/schedule", {
        json: { title: bTitle, type: bType, startTime: bStart, endTime: bEnd, weekday: bRecurring ? Number(bWeekday) : null, date: bRecurring ? null : bDate || null },
      });
      toast("Jadwal ditambahkan ✅");
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
      if (next === "DONE") toast("Selesai! 🎉");
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

  // Auto-close answer modal ketika AI selesai (polling selagi modal terbuka & status PENDING)
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
    toast("AI dikerjakan ulang…");
    const res = await api<{ tasks: Task[] }>("/api/tasks");
    setTasks(res.tasks);
    setAnswerTask(res.tasks.find((x) => x.id === id) || null);
  }

  const grouped = groupByDeadline(tasks);

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">📚 Akademik</h1>
        <div className="flex gap-2">
          <Btn onClick={() => setAiSheet(true)} className="!py-2 !px-3 text-xs">📷 Foto Tugas</Btn>
          <Btn onClick={() => setSheet(tab === "tasks" ? "task" : "block")} className="!py-2 !px-3 text-xs">
            ＋ {tab === "tasks" ? "Tugas" : "Jadwal"}
          </Btn>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("tasks")} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${tab === "tasks" ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>
          Tugas ({tasks.filter((t) => t.status !== "DONE").length})
        </button>
        <button onClick={() => setTab("schedule")} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${tab === "schedule" ? "bg-indigo-600" : "bg-zinc-800 text-zinc-400"}`}>
          Jadwal
        </button>
      </div>

      {tab === "tasks" && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) =>
            items.length === 0 ? null : (
              <div key={group}>
                <SectionTitle>
                  {group === "Terlambat" ? "🔴 " : group === "Hari Ini" ? "🟠 " : ""}
                  {group} ({items.length})
                </SectionTitle>
                <div className="space-y-2">
                  {items.map((t) => (
                    <Card key={t.id} className={`!py-3 ${t.status === "DONE" ? "opacity-50" : ""} ${group === "Terlambat" ? "border-rose-900" : ""}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggle(t)} className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${t.status === "DONE" ? "bg-emerald-600 border-emerald-600" : "border-zinc-600"}`}>
                          {t.status === "DONE" && <span className="text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${t.status === "DONE" ? "line-through" : ""}`}>{t.title}</div>
                          <div className="text-xs text-zinc-500 flex gap-2 flex-wrap mt-0.5">
                            {t.subject && <span>{t.subject}</span>}
                            {t.deadline && <span>⏰ {new Date(t.deadline).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                            {t.recurring && <span>🔁 mingguan</span>}
                          </div>
                          {(t.aiStatus !== "NONE" || t.description) && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <AiStatusBadge status={t.aiStatus} />
                              {t.aiStatus === "DONE" && (
                                <button onClick={() => setAnswerTask(t)} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold active:scale-95">
                                  Lihat Pembahasan →
                                </button>
                              )}
                              {t.aiStatus === "FAILED" && (
                                <button onClick={() => retryAi(t.id)} className="text-[10px] bg-zinc-700 text-zinc-200 px-2 py-0.5 rounded font-bold active:scale-95">
                                  🔄 Retry
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${t.priority === "URGENT" ? "bg-rose-500/20 text-rose-300" : t.priority === "HIGH" ? "bg-amber-500/20 text-amber-300" : t.priority === "MEDIUM" ? "bg-sky-500/20 text-sky-300" : "bg-zinc-700 text-zinc-400"}`}>
                            {t.priority}
                          </span>
                          <button onClick={() => delTask(t.id)} className="text-[10px] text-zinc-600">
                            🗑
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          )}
          {tasks.length === 0 && <Card className="text-sm text-zinc-500 text-center py-8">Belum ada tugas. Tap ＋ untuk menambah.</Card>}
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-2">
          {blocks.length === 0 && <Card className="text-sm text-zinc-500 text-center py-8">Belum ada jadwal. Tap ＋ untuk menambah jadwal rutin.</Card>}
          {blocks
            .slice()
            .sort((a, b) => (a.weekday ?? 7) - (b.weekday ?? 7) || a.startMinute - b.startMinute)
            .map((b) => (
              <Card key={b.id} className={`border-l-4 !py-3 ${TYPE_COLOR[b.type] || TYPE_COLOR.PERSONAL}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{b.title}</div>
                    <div className="text-xs text-zinc-400">
                      {b.weekday !== null ? `${DAYS[b.weekday]} ` : b.date ? `${b.date} ` : ""}
                      {minuteToHHMM(b.startMinute)}–{minuteToHHMM(b.endMinute)}
                      {b.location ? ` • 📍${b.location}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-zinc-500">{TYPE_LABEL[b.type]}</span>
                    <button onClick={() => delBlock(b.id)} className="text-[10px] text-zinc-600">
                      🗑
                    </button>
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
              <label className="text-xs text-zinc-400 mb-1 block">Prioritas</label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Deadline</label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Catatan (opsional)" rows={2} />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            🔁 Tugas berulang mingguan (auto-regenerate setelah selesai)
          </label>
          <Btn onClick={addTask} disabled={busy} className="w-full py-3">
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
              <label className="text-xs text-zinc-400 mb-1 block">Mulai</label>
              <Input type="time" value={bStart} onChange={(e) => setBStart(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Selesai</label>
              <Input type="time" value={bEnd} onChange={(e) => setBEnd(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={bRecurring} onChange={(e) => setBRecurring(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            🔁 Jadwal rutin mingguan
          </label>
          {bRecurring ? (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Hari</label>
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
              <label className="text-xs text-zinc-400 mb-1 block">Tanggal (event sekali)</label>
              <Input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} />
            </div>
          )}
          <Btn onClick={addBlock} disabled={busy} className="w-full py-3">
            {busy ? "Menyimpan…" : "Simpan Jadwal"}
          </Btn>
        </div>
      </Sheet>

      {/* AI photo-to-task sheet */}
      <AiTaskSheet open={aiSheet} onClose={() => setAiSheet(false)} onCreated={load} />

      {/* AI answer modal */}
      <AiAnswerModal task={answerTask} onClose={() => setAnswerTask(null)} onRetry={retryAi} />
    </div>
  );
}