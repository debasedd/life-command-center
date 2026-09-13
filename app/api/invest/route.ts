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
  if (body.monthlyInvestment !== undefined) data.monthlyInvestment = Math.max(0, Number(body.monthlyInvestment));
  if (body.years !== undefined) data.years = Math.min(30, Math.max(1, Number(body.years)));
  if (body.assets !== undefined) {
    // Validate: array of {name, pct, rate}, pct sums ≤ 100
    const assets = Array.isArray(body.assets) ? body.assets : [];
    const total = assets.reduce((s: number, a: { pct: number }) => s + Number(a.pct || 0), 0);
    if (total > 100) return NextResponse.json({ error: "Total alokasi tidak boleh > 100%" }, { status: 400 });
    data.assets = assets.map((a: { name: string; pct: number; rate: number }) => ({
      name: String(a.name), pct: Number(a.pct), rate: Number(a.rate),
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