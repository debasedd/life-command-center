import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_ASSETS = [
  { name: "Deposito", pct: 20, rate: 0.04 },
  { name: "Obligasi / RD Pendapatan Tetap", pct: 20, rate: 0.06 },
  { name: "Reksadana Saham / S&P500", pct: 40, rate: 0.1 },
  { name: "Emas", pct: 20, rate: 0.05 },
];

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let profile = await prisma.investmentProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.investmentProfile.create({
      data: { userId, monthlyInvestment: 500000, assets: DEFAULT_ASSETS, years: 10 },
    });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.monthlyInvestment !== undefined) {
    const v = Number(body.monthlyInvestment);
    if (!Number.isFinite(v) || v < 0)
      return NextResponse.json({ error: "Investasi bulanan tidak valid" }, { status: 400 });
    data.monthlyInvestment = v;
  }
  if (body.years !== undefined) {
    const v = Number(body.years);
    if (!Number.isFinite(v) || v < 1 || v > 30)
      return NextResponse.json({ error: "Rentang tahun harus 1-30" }, { status: 400 });
    data.years = Math.round(v);
  }
  if (body.assets !== undefined) {
    if (!Array.isArray(body.assets))
      return NextResponse.json({ error: "assets harus berupa array" }, { status: 400 });
    const assets = body.assets as { name?: unknown; pct?: unknown; rate?: unknown }[];
    const total = assets.reduce((s, a) => s + (Number.isFinite(Number(a.pct)) ? Number(a.pct) : 0), 0);
    if (total > 100) return NextResponse.json({ error: "Total alokasi tidak boleh > 100%" }, { status: 400 });
    if (assets.some((a) => !Number.isFinite(Number(a.pct)) || !Number.isFinite(Number(a.rate))))
      return NextResponse.json({ error: "Alokasi harus berupa angka" }, { status: 400 });
    data.assets = assets.map((a) => ({
      name: String(a.name ?? "Aset"),
      pct: Math.max(0, Number(a.pct)),
      rate: Number(a.rate),
    }));
  }
  const profile = await prisma.investmentProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, monthlyInvestment: 500000, assets: DEFAULT_ASSETS, years: 10, ...data },
  });
  return NextResponse.json({ profile });
}

/** GET projection is computed client-side in the UI. */