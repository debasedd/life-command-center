import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, dayOffset } from "@/lib/wib";
import { computeAdvisor, advisorPrompt, parseAdvisorJson, type AdvisorInput, type AdvisorResult } from "@/lib/advisor";

/** GET /api/advisor — latest evaluation + history. */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const evaluations = await prisma.evaluation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ evaluations });
}

/** POST /api/advisor — run evaluation now (rules + optional LLM enhancement). */
export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const input = await collectInput(userId);
  const base = computeAdvisor(input);

  let result: AdvisorResult = base;
  if (process.env.OPENROUTER_API_KEY) {
    const llm = await tryLlm(input, base);
    if (llm) result = llm;
  }

  const saved = await prisma.evaluation.create({
    data: { userId, healthScore: result.healthScore, result: result as unknown as Prisma.InputJsonValue },
  });

  await prisma.scheduledNotification.create({
    data: {
      userId,
      type: "WEEKLY_EVAL",
      sendAt: new Date(Date.now() + 2000),
      title: `Evaluasi keuangan siap: skor ${result.healthScore}`,
      body: `${result.allocationVerdict} — ${result.recommendations.length} rekomendasi baru menantimu.`,
    },
  });

  return NextResponse.json({ evaluation: saved });
}

async function collectInput(userId: string): Promise<AdvisorInput> {
  const today = wibToday();
  const from = dayOffset(today, -30);
  const txs = await prisma.transaction.findMany({
    where: { userId, day: { gte: from } },
    include: { category: true },
  });
  const income30 = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense30 = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const catMap = new Map<string, number>();
  for (const t of txs.filter((t) => t.type === "EXPENSE")) {
    catMap.set(t.category.name, (catMap.get(t.category.name) || 0) + t.amount);
  }
  const byCategory = [...catMap.entries()]
    .map(([name, total]) => ({ name, total, pct: expense30 ? Math.round((total / expense30) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
  const loggingDays = new Set(txs.map((t) => t.day)).size;
  const goals = await prisma.savingsGoal.findMany({ where: { userId, status: "ACTIVE" } });
  const deposits90 = await prisma.goalDeposit.findMany({
    where: { userId, day: { gte: dayOffset(today, -90) } },
  });
  const monthlyDeposit = Math.round(deposits90.reduce((s, d) => s + d.amount, 0) / 3);
  const profile = await prisma.investmentProfile.findUnique({ where: { userId } });
  return {
    income30,
    expense30,
    byCategory,
    savingsRate: income30 > 0 ? (income30 - expense30) / income30 : 0,
    activeGoals: goals.length,
    goalProgress: goals.map((g) => ({ name: g.name, progress: g.targetAmount ? g.currentAmount / g.targetAmount : 0 })),
    avgMonthlyDeposit: monthlyDeposit,
    loggingDays,
    monthlyInvestment: profile?.monthlyInvestment ?? 0,
  };
}

async function tryLlm(input: AdvisorInput, base: { breakdown: { savings: number; logging: number; needsWants: number; goals: number } }) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "Kamu financial advisor untuk pelajar Indonesia. Balas HANYA JSON sesuai skema." },
          { role: "user", content: advisorPrompt(input) },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = parseAdvisorJson(content);
    return parsed ? { ...parsed, breakdown: base.breakdown } as AdvisorResult : null;
  } catch {
    return null;
  }
}