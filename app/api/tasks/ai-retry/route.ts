import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solveQuestion } from "@/lib/ai-homework";

// Hobby plan max: function lives 60s, long enough to await the solve inline.
export const maxDuration = 60;

/** POST /api/tasks/ai-retry — retry the AI solve for a failed task. Body: {id} */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const task = await prisma.task.findFirst({ where: { id: body.id, userId } });
  if (!task) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  if (!task.description) return NextResponse.json({ error: "Task tidak punya soal" }, { status: 400 });

  await prisma.task.update({ where: { id: task.id }, data: { aiStatus: "PENDING", aiError: null } });

  const result = await solveQuestion(task.description!, 50000);
  if (result.ok) {
    const done = await prisma.task.update({
      where: { id: task.id },
      data: { aiAnswer: result.answer!, aiStatus: "DONE", aiAnswerAt: new Date(), aiError: null },
    });
    return NextResponse.json({ ok: true, aiStatus: done.aiStatus, aiAnswer: done.aiAnswer });
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { aiStatus: "FAILED", aiError: result.error || "unknown" },
  });
  return NextResponse.json({ ok: false, error: result.error });
}
