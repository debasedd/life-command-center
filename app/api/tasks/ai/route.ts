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
 * Terima JSON ({photo} atau {text}) ATAU form-urlencoded (field photo/image/base64/text)
 * ATAU raw text — biar Shortcut iOS gampang dibikin tanpa format JSON yang rapuh.
 * AI membaca dan memutuskan: tugas (dikerjakan inline) atau keuangan (langsung jadi transaksi).
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ct = (req.headers.get("content-type") || "").toLowerCase();
  let photoRaw = "";
  let text = "";

  if (ct.includes("form-urlencoded")) {
    const form = await req.formData().catch(() => null);
    if (form) {
      photoRaw = String(form.get("photo") ?? form.get("image") ?? form.get("base64") ?? "");
      text = String(form.get("text") ?? "").trim();
    }
  } else {
    const rawText = await req.text();
    let j: Record<string, unknown> | null = null;
    if (rawText.trim().startsWith("{")) {
      try {
        j = JSON.parse(rawText);
      } catch {
        j = null;
      }
    }
    if (j && typeof j === "object") {
      photoRaw = String(j.photo ?? j.image ?? j.base64 ?? "").trim();
      text = String(j.text ?? "").trim();
    } else {
      text = rawText.trim();
    }
  }

  if (!photoRaw && text.length < 3) {
    return NextResponse.json(
      { error: 'Body kosong — kirim field "text" (teks soal) atau "photo"/"image" (base64 foto), JSON atau Form' },
      { status: 400 }
    );
  }

  // --- Teks (dari shortcut /share atau ketik manual): task + solve inline ---
  if (!photoRaw && text) {
    const firstLine = text.split("\n").find((l: string) => l.trim().length > 0) || text;
    const task = await prisma.task.create({
      data: {
        userId,
        title: firstLine.slice(0, 80),
        description: text.slice(0, 5000),
        priority: "MEDIUM",
        aiStatus: "PENDING",
      },
    });
    const result = await solveQuestion(text, 50000);
    if (result.ok) {
      const done = await prisma.task.update({
        where: { id: task.id },
        data: { aiAnswer: result.answer!, aiStatus: "DONE", aiAnswerAt: new Date(), aiError: null },
      });
      return NextResponse.json({ kind: "task", task: { id: done.id, title: done.title, aiStatus: done.aiStatus, aiAnswer: done.aiAnswer } });
    }
    await prisma.task.update({ where: { id: task.id }, data: { aiStatus: "FAILED", aiError: result.error || "unknown" } });
    return NextResponse.json({ kind: "task", task: { id: task.id, title: task.title, aiStatus: "FAILED" }, error: result.error });
  }

  // --- Foto: vision → auto-mutu tugas atau keuangan ---
  // Shortcuts kirim base64 mentah (tanpa prefix data URL) — bungkus otomatis.
  // Shortcuts kirim base64 mentah (tanpa prefix data URL) — bungkus otomatis.
  let photo = photoRaw.replace(/\s+/g, "");
  if (!photo) {
    return NextResponse.json(
      { error: 'Field photo atau text wajib — photo (base64/data URL foto) atau text (teks soal/catatan)' },
      { status: 400 }
    );
  }
  if (!photo.startsWith("data:")) {
    const mime = photo.startsWith("/9j/") ? "image/jpeg" : photo.startsWith("iVBOR") ? "image/png" : photo.startsWith("UklGR") ? "image/webp" : "image/jpeg";
    photo = `data:${mime};base64,${photo}`;
  }
  const parsed = parseDataUrl(photo);
  if (!parsed) {
    const head = photo.slice(0, 50);
    return NextResponse.json(
      { error: `Format data URL salah — harus diawali "data:image/jpeg;base64," lalu isi base64 tanpa dipisah baris. Diterima: "${head}"` },
      { status: 400 }
    );
  }
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
