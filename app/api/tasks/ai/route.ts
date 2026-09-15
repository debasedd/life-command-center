import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractFromPhoto, solveQuestion, parseDataUrl } from "@/lib/ai-homework";

// Hobby plan max: function lives 60s, long enough to await the solve inline.
export const maxDuration = 60;

/**
 * POST /api/tasks/ai
 * Body: { photo: "data:image/jpeg;base64,..." }
 * 1) Vision AI extracts the assignment from the photo → creates the task
 * 2) Solve awaited inline so the answer is usually ready in the same request.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const photo = typeof body.photo === "string" ? body.photo : "";
  const parsed = parseDataUrl(photo);
  if (!parsed) return NextResponse.json({ error: "Foto tidak valid" }, { status: 400 });
  if (parsed.base64.length > 7_000_000) {
    return NextResponse.json({ error: "Foto terlalu besar (maks ~5MB). Kompres dulu." }, { status: 400 });
  }

  const extracted = await extractFromPhoto(parsed.base64, parsed.mime);
  if (!extracted.ok) {
    return NextResponse.json({ error: extracted.error }, { status: 422 });
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: extracted.title!,
      subject: extracted.subject ?? null,
      description: extracted.question!.slice(0, 5000),
      priority: "MEDIUM",
      aiStatus: "PENDING",
      photoMime: parsed.mime,
      photoData: parsed.base64,
    },
  });

  // Awaited solve: serverless kills fire-and-forget work after the response.
  const result = await solveQuestion(extracted.question!, 50000);
  if (result.ok) {
    const done = await prisma.task.update({
      where: { id: task.id },
      data: { aiAnswer: result.answer!, aiStatus: "DONE", aiAnswerAt: new Date(), aiError: null },
    });
    return NextResponse.json({ task: { id: done.id, title: done.title, subject: done.subject, aiStatus: done.aiStatus, aiAnswer: done.aiAnswer } });
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
