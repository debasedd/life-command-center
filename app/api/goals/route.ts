import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, dayOffset } from "@/lib/wib";

/** GET /api/goals — list with progress & forecast. */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  // Compute avg monthly deposit from last 90 days
  const from = dayOffset(wibToday(), -90);
  const deposits = await prisma.goalDeposit.groupBy({
    by: ["goalId"],
    where: { userId, day: { gte: from } },
    _sum: { amount: true },
  });
  const byGoal = new Map(deposits.map((d) => [d.goalId, d._sum.amount || 0]));
  const enriched = goals.map((g) => {
    const total90 = byGoal.get(g.id) || 0;
    const monthly = Math.round(total90 / 3);
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const monthsNeeded = monthly > 0 ? Math.ceil(remaining / monthly) : null;
    return { ...g, avgMonthlyDeposit: monthly, monthsToFinish: monthsNeeded, progress: g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0 };
  });
  return NextResponse.json({ goals: enriched });
}

/** POST /api/goals — create. */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name, targetAmount, deadline, monthlyCommitment, icon } = body;
  if (!name || !targetAmount || Number(targetAmount) <= 0)
    return NextResponse.json({ error: "Nama & target nominal wajib" }, { status: 400 });
  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name: String(name).trim(),
      targetAmount: Number(targetAmount),
      deadline: deadline || null,
      monthlyCommitment: monthlyCommitment ? Number(monthlyCommitment) : null,
      icon: icon || "target",
    },
  });
  return NextResponse.json({ goal });
}

/** PATCH — update, deposit, milestone notification trigger. */
export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const existing = await prisma.savingsGoal.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Goal tidak ditemukan" }, { status: 404 });

  if (body.action === "deposit") {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Nominal setoran harus > 0" }, { status: 400 });
    const goal = await prisma.savingsGoal.update({
      where: { id: body.id },
      data: { currentAmount: { increment: amount } },
    });
    await prisma.goalDeposit.create({ data: { userId, goalId: body.id, amount, day: wibToday() } });
    const before = existing.currentAmount / existing.targetAmount;
    const after = goal.currentAmount / goal.targetAmount;
    const milestones = [0.25, 0.5, 0.75, 1.0];
    for (const m of milestones) {
      if (before < m && after >= m) {
        const label = m === 1 ? "100% — tercapai!" : `${m * 100}%!`;
        await prisma.scheduledNotification.create({
          data: {
            userId,
            type: "MILESTONE",
            sendAt: new Date(Date.now() + 2000),
            title: `${goal.name} ${label}`,
            body: m === 1 ? `Target ${goal.name} sudah tercapai. Selamat!` : `Progres tabungan ${goal.name} mencapai ${m * 100}%. Terus semangat!`,
          },
        });
      }
    }
    if (goal.currentAmount >= goal.targetAmount && goal.status === "ACTIVE") {
      await prisma.savingsGoal.update({ where: { id: goal.id }, data: { status: "ACHIEVED" } });
    }
    return NextResponse.json({ goal });
  }

  const data: Record<string, unknown> = {};
  for (const k of ["name", "icon", "status"]) if (body[k] !== undefined) data[k] = body[k];
  if (body.targetAmount !== undefined) data.targetAmount = Number(body.targetAmount);
  if (body.deadline !== undefined) data.deadline = body.deadline || null;
  if (body.monthlyCommitment !== undefined) data.monthlyCommitment = body.monthlyCommitment ? Number(body.monthlyCommitment) : null;
  const goal = await prisma.savingsGoal.update({ where: { id: body.id }, data });
  return NextResponse.json({ goal });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await prisma.savingsGoal.deleteMany({ where: { id, userId } });
  await prisma.goalDeposit.deleteMany({ where: { goalId: id, userId } });
  return NextResponse.json({ ok: true });
}