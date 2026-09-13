import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solveQuestion } from "@/lib/ai-homework";

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

  void (async () => {
    try {
      const result = await solveQuestion(task.description!);
      if (result.ok) {
        await prisma.task.update({
          where: { id: task.id },
          data: { aiAnswer: result.answer!, aiStatus: "DONE", aiAnswerAt: new Date(), aiError: null },
        });
      } else {
        await prisma.task.update({
          where: { id: task.id },
          data: { aiStatus: "FAILED", aiError: result.error || "unknown" },
        });
      }
    } catch (e) {
      await prisma.task
        .update({ where: { id: task.id }, data: { aiStatus: "FAILED", aiError: e instanceof Error ? e.message : "unknown" } })
        .catch(() => {});
    }
  })();

  return NextResponse.json({ ok: true });
}