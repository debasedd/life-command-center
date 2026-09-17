import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** GET /api/tasks?status=&subject= — list tasks sorted by deadline & priority. */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status");
  const subject = req.nextUrl.searchParams.get("subject");
  const tasks = await prisma.task.findMany({
    where: { userId, ...(status ? { status: status as never } : {}), ...(subject ? { subject } : {}) },
    orderBy: [{ deadline: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks });
}

/** POST /api/tasks — create task. */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { title, description, subject, priority, deadline, estimatedMinutes, recurring } = body;
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
  const task = await prisma.task.create({
    data: {
      userId,
      title: String(title).trim(),
      description: description ? String(description) : null,
      subject: subject ? String(subject) : null,
      priority: priority || "MEDIUM",
      deadline: deadline ? new Date(deadline) : null,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      recurring: Boolean(recurring),
    },
  });
  // Schedule deadline reminders (H-1 19:00 and H-0 07:00 WIB)
  await scheduleTaskReminders(task.id, task.title, task.deadline, userId);
  return NextResponse.json({ task });
}

/** PATCH /api/tasks — update task (id in body). */
export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const existing = await prisma.task.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });

  const wasTodo = existing.status !== "DONE";
  const data: Record<string, unknown> = {};
  for (const k of ["title", "description", "subject", "priority", "status", "recurring"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.estimatedMinutes !== undefined) data.estimatedMinutes = body.estimatedMinutes ? Number(body.estimatedMinutes) : null;

  const task = await prisma.task.update({ where: { id: body.id }, data });

  if (body.status === "DONE" && wasTodo && existing.recurring) {
    // Recurring: regenerate next week's instance
    const base = existing.deadline || new Date();
    const next = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    await prisma.task.create({
      data: {
        userId,
        title: existing.title,
        description: existing.description,
        subject: existing.subject,
        priority: existing.priority,
        deadline: next,
        estimatedMinutes: existing.estimatedMinutes,
        recurring: true,
      },
    });
    await scheduleTaskReminders(undefined, existing.title, next, userId);
  }
  return NextResponse.json({ task });
}

/** DELETE /api/tasks?id= */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await prisma.task.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

async function scheduleTaskReminders(taskId: string | undefined, title: string, deadline: Date | null, userId: string) {
  if (!deadline) return;
  const pref = await prisma.notificationPref.findUnique({
    where: { userId_type: { userId, type: "TASK_DEADLINE" } },
  });
  if (pref && !pref.enabled) return;
  const d = new Date(deadline);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mk = (when: Date, t: string, b: string) => ({ userId, type: "TASK_DEADLINE" as const, sendAt: when, title: t, body: b });
  const rows = [];
  if (dayStart.getTime() > Date.now()) {
    const h0 = new Date(dayStart.getTime() + 7 * 3600 * 1000);
    if (h0.getTime() > Date.now() && h0.getTime() < d.getTime()) {
      rows.push(mk(h0, "Tugas hari ini", `"${title}" dijadwalkan hari ini — jangan lupa!`));
    }
  }
  const h1 = new Date(dayStart.getTime() - 5 * 3600 * 1000); // 19:00 the day before
  if (h1.getTime() > Date.now()) {
    rows.push(mk(h1, "Deadline besok", `"${title}" harus dikumpulkan besok!`));
  }
  if (rows.length) {
    // Dedupe: buang reminder pending lama utk judul yang sama sebelum jadwal baru (cegah backlog).
    await prisma.scheduledNotification.deleteMany({
      where: { userId, type: "TASK_DEADLINE", sentAt: null, title: { in: [...new Set(rows.map((r) => r.title))] }, body: { contains: `"${title}"` } },
    });
    await prisma.scheduledNotification.createMany({ data: rows });
  }
}