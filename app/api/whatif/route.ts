import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, dayOffset } from "@/lib/wib";

/** POST /api/whatif — purchase impact simulation. */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const price = Number(body.price);
  const itemName = String(body.name || "Pembelian");
  const installmentMonths = Number(body.installmentMonths || 0);
  if (!price || price <= 0) return NextResponse.json({ error: "Harga harus > 0" }, { status: 400 });

  const today = wibToday();
  const goals = await prisma.savingsGoal.findMany({ where: { userId, status: "ACTIVE" } });
  const deposits90 = await prisma.goalDeposit.findMany({ where: { userId, day: { gte: dayOffset(today, -90) } } });
  const monthlyDepositTotal = deposits90.reduce((s, d) => s + d.amount, 0) / 3;

  const txs = await prisma.transaction.findMany({ where: { userId, day: { gte: dayOffset(today, -90) } } });
  const monthlyIncome = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0) / 3;
  const monthlyExpense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0) / 3;
  const monthlySurplus = monthlyIncome - monthlyExpense;

  // Monthly burden: installment spreads the cost; one-time purchase hits surplus instantly
  const monthlyCost = installmentMonths > 0 ? price / installmentMonths : price;

  const goalImpacts = goals.map((g) => {
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const gMonthly = deposits90.filter((d) => d.goalId === g.id).reduce((s, d) => s + d.amount, 0) / 3;
    // Delay in months = cost borne by this goal / its monthly deposit rate
    const monthsDelayed = gMonthly > 0 ? Math.round(monthlyCost / gMonthly) : null;
    const pctOfGoal = g.targetAmount > 0 ? Math.round((price / g.targetAmount) * 100) : 0;
    return {
      name: g.name,
      icon: g.icon,
      remaining,
      monthlyDeposit: Math.round(gMonthly),
      monthsDelayed,
      pctOfGoal,
    };
  });

  // Opportunity cost: if invested 10y at 8%/yr compound monthly
  const monthlyRate = 0.08 / 12;
  const fv = price * Math.pow(1 + monthlyRate, 120);
  const opportunity10y = Math.round(fv);

  // Verdict scoring (rules-based)
  let score = 50;
  if (installmentMonths > 0) {
    const mCost = price / installmentMonths;
    if (mCost > monthlySurplus) score = 20;
    else if (mCost > monthlySurplus * 0.5) score = 40;
    else score = 65;
  } else {
    if (price > monthlySurplus) score = 15;
    else if (price > monthlySurplus * 0.5) score = 40;
    else score = 70;
  }
  if (goals.length === 0) score += 10;
  else if (goalImpacts.some((g) => (g.monthsDelayed || 0) >= 3)) score -= 15;
  if (monthlySurplus <= 0) score -= 25;
  const verdict = score >= 60 ? "AMAN" : score >= 35 ? "HATI-HATI" : "BERISIKO";

  const deficit = Math.round(Math.max(0, monthlyExpense + monthlyCost - monthlyIncome));
  const reasons: string[] = [];
  if (monthlySurplus <= 0) reasons.push("Arus kas bulanan kamu defisit — pembelian ini memperparah.");
  const worst = goalImpacts.filter((g) => (g.monthsDelayed || 0) >= 3).sort((a, b) => (b.monthsDelayed || 0) - (a.monthsDelayed || 0))[0];
  if (worst) reasons.push(`Goal "${worst.name}" mundur ±${worst.monthsDelayed} bulan karena pembelian ini.`);
  if (monthlySurplus > 0 && price > monthlySurplus && installmentMonths === 0) reasons.push("Harga melebihi surplus bulanan kamu.");
  if (reasons.length === 0) reasons.push("Pembelian ini tidak mengganggu target tabungan kamu secara signifikan.");

  return NextResponse.json({
    itemName,
    price,
    installmentMonths,
    monthlySurplus: Math.round(monthlySurplus),
    monthlyIncome: Math.round(monthlyIncome),
    monthlyExpense: Math.round(monthlyExpense),
    goalImpacts,
    opportunity10y,
    verdict,
    reasons,
    deficit,
  });
}