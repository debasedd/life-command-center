import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractFromPhoto, solveQuestion, parseDataUrl } from "@/lib/ai-homework";

/**
 * POST /api/tasks/ai
 * Body: { photo: "data:image/jpeg;base64,..." }
 * 1) Vision AI extracts the assignment from the photo → creates the task
 * 2) Fire-and-forget: AI writes the full worked solution, saved to the task
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

  // Background solve (fire-and-forget — endpoint returns immediately)
  void (async () => {
    try {
      const result = await solveQuestion(extracted.question!);
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