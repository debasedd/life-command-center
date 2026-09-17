import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solveQuestion } from "@/lib/ai-homework";
import { resolveAiModel } from "@/lib/ai-model";

// Hobby plan max: function lives 60s, long enough to await the solve inline.
export const maxDuration = 60;

/**
 * POST /api/tasks/ai-text
 * Body: { text: "soal atau materi yang diketik manual" }
 * Creates the task from typed text, then solves inline (awaited) so the
 * answer is usually ready in the same request.
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

  // Awaited solve: serverless kills fire-and-forget work after the response.
  const aiModel = await resolveAiModel(userId);
  const result = await solveQuestion(text, 50000, aiModel);
  if (result.ok) {
    const done = await prisma.task.update({
      where: { id: task.id },
      data: { aiAnswer: result.answer!, aiStatus: "DONE", aiAnswerAt: new Date(), aiError: null },
    });
    return NextResponse.json({ task: { id: done.id, title: done.title, aiStatus: done.aiStatus, aiAnswer: done.aiAnswer } });
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { aiStatus: "FAILED", aiError: result.error || "unknown" },
  });
  return NextResponse.json({
    task: { id: task.id, title: task.title, aiStatus: "FAILED" },
    error: result.error,
  });
}
