import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractFromPhoto, solveQuestion, parseDataUrl } from "@/lib/ai-homework";
import { ruleCategorize } from "@/lib/ai-categorize";
import { wibToday } from "@/lib/wib";

// Hobby plan max: function lives 60s, long enough to await the solve inline.
export const maxDuration = 60;

/**
 * POST /api/tasks/ai
 * Body: { photo: "data:image/jpeg;base64,..." }
 * AI reads the photo and decides:
 * - kind "keuangan" → creates a transaction (amount + INCOME/EXPENSE auto-decided, AI-categorized)
 * - kind "tugas"    → creates the task, then solves inline so the answer is ready in the same request.
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

  // --- Financial document: auto-create transaction ---
  if (extracted.kind === "keuangan" && extracted.amount && extracted.txType) {
    const categories = await prisma.category.findMany({ where: { userId } });
    if (categories.length === 0) {
      return NextResponse.json({ error: "Belum ada kategori — buat dulu di Keuangan" }, { status: 400 });
    }
    let finalCategoryId: string | null = null;
    const r = ruleCategorize(extracted.note || extracted.title || "foto", extracted.txType, categories);
    if (r.categoryId) finalCategoryId = r.categoryId;
    if (!finalCategoryId) {
      const misc = categories.find((c) => c.name === "Lain-lain");
      finalCategoryId = (misc || categories[0]).id;
    }
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: extracted.txType,
        amount: extracted.amount,
        categoryId: finalCategoryId,
        note: extracted.note || "Dari foto",
        day: wibToday(),
        aiCategorized: true,
      },
      include: { category: true },
    });
    return NextResponse.json({
      kind: "transaction",
      transaction: {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        categoryName: tx.category.name,
        categoryIcon: tx.category.icon,
      },
    });
  }

  // --- School assignment: task + inline solve ---
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

  const result = await solveQuestion(extracted.question!, 50000);
  if (result.ok) {
    const done = await prisma.task.update({
      where: { id: task.id },
      data: { aiAnswer: result.answer!, aiStatus: "DONE", aiAnswerAt: new Date(), aiError: null },
    });
    return NextResponse.json({ kind: "task", task: { id: done.id, title: done.title, subject: done.subject, aiStatus: done.aiStatus, aiAnswer: done.aiAnswer } });
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { aiStatus: "FAILED", aiError: result.error || "unknown" },
  });
  return NextResponse.json({
    kind: "task",
    task: { id: task.id, title: task.title, aiStatus: "FAILED" },
    error: result.error,
  });
}
