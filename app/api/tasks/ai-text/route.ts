import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solveQuestion } from "@/lib/ai-homework";

/**
 * POST /api/tasks/ai-text
 * Body: { text: "soal atau materi yang diketik manual" }
 * Creates the task from typed text, then solves in background (same flow as photo).
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 3) return NextResponse.json({ error: "Soal terlalu pendek" }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: "Teks terlalu panjang (maks 5000 karakter)" }, { status: 400 });

  const firstLine = text.split("\n").find((l: string) => l.trim().length > 0) || text;
  const title = firstLine.slice(0, 80);

  const task = await prisma.task.create({
    data: {
      userId,
      title,
      description: text,
      priority: "MEDIUM",
      aiStatus: "PENDING",
    },
  });

  // Background solve (fire-and-forget — endpoint returns immediately)
  void (async () => {
    try {
      const result = await solveQuestion(text);
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

  return NextResponse.json({ task: { id: task.id, title: task.title, subject: task.subject, aiStatus: task.aiStatus } });
}
