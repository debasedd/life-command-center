import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ruleCategorize } from "@/lib/ai-categorize";

/** GET /api/transactions?from=&to=&categoryId=&type= */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const categoryId = sp.get("categoryId");
  const type = sp.get("type");
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      ...(from ? { day: { gte: from } } : {}),
      ...(to ? { day: { lte: to } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type: type as never } : {}),
    },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    include: { category: true },
    take: 500,
  });
  return NextResponse.json({ transactions: txs });
}

/** POST /api/transactions — create with auto-categorization. */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { type, amount, note, day, categoryId } = body;
  if (!type || !["INCOME", "EXPENSE"].includes(type)) return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
  if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "Nominal harus > 0" }, { status: 400 });

  const categories = await prisma.category.findMany({ where: { userId } });
  if (categories.length === 0) return NextResponse.json({ error: "Belum ada kategori — buat dulu" }, { status: 400 });

  let finalCategoryId: string | null = categoryId || null;
  let aiCategorized = false;

  if (!finalCategoryId) {
    // 1) Learned corrections
    const corrections = await prisma.aiCorrection.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const exact = corrections.filter((c) => c.note && String(body.note || "").toLowerCase().includes(c.note.toLowerCase()));
    if (exact.length) {
      finalCategoryId = exact[exact.length - 1].categoryId;
      aiCategorized = true;
    }
    // 2) LLM
    if (!finalCategoryId && process.env.OPENROUTER_API_KEY) {
      finalCategoryId = await llmCategorize(String(note || ""), type, categories);
      if (finalCategoryId) aiCategorized = true;
    }
    // 3) Rule fallback
    if (!finalCategoryId) {
      const r = ruleCategorize(String(note || ""), type, categories);
      if (r.categoryId) {
        finalCategoryId = r.categoryId;
        aiCategorized = true;
      }
    }
    // 4) Ultimate fallback: "Lain-lain" or first category
    if (!finalCategoryId) {
      const misc = categories.find((c) => c.name === "Lain-lain");
      finalCategoryId = (misc || categories[0]).id;
    }
  }

  const tx = await prisma.transaction.create({
    data: {
      userId,
      type,
      amount: Number(amount),
      categoryId: finalCategoryId,
      note: note ? String(note) : null,
      day: day || wibTodayStr(),
      aiCategorized,
    },
    include: { category: true },
  });
  return NextResponse.json({ transaction: tx });
}

/** PATCH — edit (id in body). */
export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const existing = await prisma.transaction.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type;
  if (body.amount !== undefined) data.amount = Number(body.amount);
  if (body.note !== undefined) data.note = body.note || null;
  if (body.day !== undefined) data.day = body.day;
  if (body.categoryId !== undefined) {
    data.categoryId = body.categoryId;
    data.aiCategorized = false;
    // Learning loop: user manually corrected → record for future few-shot
    if (existing.note) {
      await prisma.aiCorrection.create({
        data: { userId, note: existing.note, categoryId: body.categoryId },
      });
    }
  }
  const tx = await prisma.transaction.update({ where: { id: body.id }, data, include: { category: true } });
  return NextResponse.json({ transaction: tx });
}

/** DELETE /api/transactions?id= */
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await prisma.transaction.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

async function llmCategorize(note: string, type: string, categories: { id: string; name: string }[]): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'Kamu adalah auto-categorizer transaksi keuangan pelajar Indonesia. Balas HANYA JSON: {"category": "<nama kategori>"}. Pilih dari daftar kategori yang diberikan. Jika tidak yakin, balas {"category": null}.',
          },
          {
            role: "user",
            content: `Tipe transaksi: ${type}\nCatatan: "${note}"\nKategori tersedia: ${categories.map((c) => c.name).join(", ")}`,
          },
        ],
        max_tokens: 50,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
    const match = categories.find((c) => c.name.toLowerCase() === String(parsed.category || "").toLowerCase());
    return match?.id ?? null;
  } catch {
    return null;
  }
}

function wibTodayStr(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function wibToday(): string {
  return wibTodayStr();
}