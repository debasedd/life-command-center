import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractFromPhoto, solveQuestion } from "@/lib/ai-homework";
import { ruleCategorize } from "@/lib/ai-categorize";
import { wibToday } from "@/lib/wib";

// Hobby plan max: vision + solve inline dalam 60s.
export const maxDuration = 60;

/**
 * POST /api/tasks/ai-process — Body: {id}
 * Memproses task placeholder foto (upload instant dari shortcut):
 * vision membaca foto → AI memutuskan tugas ATAU keuangan →
 * tugas di-update dengan pembahasan, atau task dihapus & jadi transaksi.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body?.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  const task = await prisma.task.findFirst({ where: { id: body.id, userId } });
  if (!task) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  if (!task.photoData || !task.photoMime) {
    return NextResponse.json({ error: "Task tidak punya foto" }, { status: 400 });
  }
  // Lock: hindari proses dobel.
  if (task.aiStatus === "PROCESSING") {
    return NextResponse.json({ ok: true, status: "PROCESSING", skipped: true });
  }
  await prisma.task.update({ where: { id: task.id }, data: { aiStatus: "PROCESSING" } });

  const result = await extractFromPhoto(task.photoData, task.photoMime);
  if (!result.ok) {
    await prisma.task.update({
      where: { id: task.id },
      data: { aiStatus: "FAILED", aiError: result.error || "unknown" },
    });
    return NextResponse.json({ ok: false, status: "FAILED", error: result.error });
  }

  // --- Keuangan: buat transaksi, hapus placeholder task ---
  if (result.kind === "keuangan" && result.amount && result.txType) {
    const categories = await prisma.category.findMany({ where: { userId } });
    let categoryId: string | null = null;
    if (categories.length > 0) {
      const r = ruleCategorize(result.note || result.title || "foto", result.txType, categories);
      categoryId = r.categoryId;
      if (!categoryId) {
        const misc = categories.find((c) => c.name === "Lain-lain");
        categoryId = (misc || categories[0]).id;
      }
    }
    if (categoryId) {
      await prisma.transaction.create({
        data: {
          userId,
          type: result.txType,
          amount: result.amount,
          categoryId,
          note: result.note || result.title || "Dari foto",
          day: wibToday(),
          aiCategorized: true,
        },
      });
      await prisma.task.delete({ where: { id: task.id } });
      return NextResponse.json({ ok: true, status: "TRANSACTION", type: result.txType, amount: result.amount });
    }
    // Tidak ada kategori → simpan sebagai tugas berisi ringkasan keuangan
  }

  // --- Tugas: update placeholder jadi tugas beneran + solve ---
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      title: result.title || task.title,
      subject: result.subject ?? task.subject,
      description: result.question!.slice(0, 5000),
      aiStatus: "PENDING",
    },
  });

  const solve = await solveQuestion(result.question!, 50000);
  if (solve.ok) {
    await prisma.task.update({
      where: { id: task.id },
      data: { aiAnswer: solve.answer!, aiStatus: "DONE", aiAnswerAt: new Date(), aiError: null },
    });
    return NextResponse.json({ ok: true, status: "DONE" });
  }
  await prisma.task.update({
    where: { id: task.id },
    data: { aiStatus: "FAILED", aiError: solve.error || "unknown" },
  });
  return NextResponse.json({ ok: false, status: "FAILED", error: solve.error });
}
