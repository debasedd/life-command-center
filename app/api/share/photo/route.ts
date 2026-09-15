import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/share/photo
 * Untuk iOS Shortcut: kirim foto sebagai base64 — respons INSTAN (tanpa nunggu AI).
 * Task placeholder dibuat dengan aiStatus PENDING; diproses saat app dibuka
 * lewat /api/tasks/ai-process.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const raw = body
    ? body.image ?? body.photo ?? body.base64 ?? body.file ?? (typeof body === "object" && typeof body.text === "undefined" ? null : null)
    : null;
  // Fallback: kalau body dikirim sebagai string base64 mentah
  let image = typeof raw === "string" ? raw : "";
  if (!image && typeof body === "string") image = body;
  if (!image) {
    return NextResponse.json({ error: "Field image (base64) wajib" }, { status: 400 });
  }

  image = image.replace(/\s+/g, "");

  // Deteksi mime dari awalan base64, bungkus jadi data URL kalau polos
  let dataUrl = image;
  if (!image.startsWith("data:")) {
    const mime = image.startsWith("/9j/") ? "image/jpeg" : image.startsWith("iVBOR") ? "image/png" : image.startsWith("UklGR") ? "image/webp" : "image/jpeg";
    dataUrl = `data:${mime};base64,${image}`;
  }
  const parsed = /^(data:(image\/[a-z+]+);base64,)(.+)$/.exec(dataUrl);
  if (!parsed || parsed[3].length < 500) {
    return NextResponse.json({ error: "Isi base64 foto tidak valid / terlalu kecil" }, { status: 400 });
  }
  if (parsed[3].length > 10_000_000) {
    return NextResponse.json({ error: "Foto terlalu besar (maks ~7MB base64)" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: "Foto (menunggu diproses AI)",
      description: null,
      priority: "MEDIUM",
      aiStatus: "PENDING",
      photoMime: parsed[2],
      photoData: parsed[3],
    },
  });

  // Balas INSTAN — AI mutusin belakangan (pas app dibuka).
  return NextResponse.json({ ok: true, id: task.id, aiStatus: task.aiStatus });
}
