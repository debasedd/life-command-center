import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "Nama kategori wajib" }, { status: 400 });
  const count = await prisma.category.count({ where: { userId } });
  if (count >= 30) return NextResponse.json({ error: "Maksimal 30 kategori" }, { status: 400 });
  const category = await prisma.category.create({
    data: { userId, name: String(body.name).trim(), icon: body.icon || "package", color: body.color || "#111113" },
  });
  return NextResponse.json({ category });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const count = await prisma.transaction.count({ where: { categoryId: id, userId } });
  if (count > 0) return NextResponse.json({ error: `Tidak bisa hapus: ${count} transaksi memakai kategori ini` }, { status: 400 });
  await prisma.category.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}