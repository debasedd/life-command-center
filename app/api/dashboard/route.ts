import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wibToday, wibMinuteOfDay, wibWeekday, lastNDays, dayOffset } from "@/lib/wib";

/** GET /api/dashboard — aggregated data for the home screen. */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const today = wibToday();
  const nowMinute = wibMinuteOfDay();
  const weekday = wibWeekday();

  const [tasks, blocks, txToday, water, settings, habits, habitCheckins, workoutsToday, goals, latestEval] = await Promise.all([
    prisma.task.findMany({ where: { userId, status: { not: "DONE" } }, orderBy: [{ deadline: "asc" }] }),
    prisma.scheduleBlock.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId, day: today }, include: { category: true } }),
    prisma.waterLog.aggregate({ where: { userId, day: today }, _sum: { amountMl: true } }),
    prisma.settings.findUnique({ where: { userId } }),
    prisma.habit.findMany({ where: { userId, archived: false } }),
    prisma.habitCheckin.findMany({ where: { userId, day: today } }),
    prisma.workout.findMany({ where: { userId, day: today } }),
    prisma.savingsGoal.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.evaluation.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  // Today's blocks: weekday routine + one-off dated
  const todayBlocks = blocks
    .filter((b) => b.weekday === weekday || b.date === today)
    .sort((a, b) => a.startMinute - b.startMinute);
  const currentBlock = todayBlocks.find((b) => b.startMinute <= nowMinute && b.endMinute > nowMinute) || null;
  const nextBlock = todayBlocks.find((b) => b.startMinute > nowMinute) || null;

  // Overdue tasks: deadline < today's start
  const todayStart = new Date(today + "T00:00:00+07:00").getTime();
  const overdue = tasks.filter((t) => t.deadline && t.deadline.getTime() < todayStart);
  const dueToday = tasks.filter((t) => {
    if (!t.deadline) return false;
    const dl = t.deadline.getTime();
    const todayEnd = todayStart + 24 * 3600 * 1000;
    return dl >= todayStart && dl < todayEnd;
  });

  const settingsSafe = settings || { waterTargetMl: 2000, glassMl: 250, workoutPerWeek: 3, quietStartMinute: 1320, quietEndMinute: 360 };
  const waterTarget = settingsSafe.waterTargetMl;
  const todayMl = water._sum.amountMl || 0;

  // week workouts
  const weekDays = lastNDays(7);
  const weekWorkouts = await prisma.workout.findMany({ where: { userId, day: { in: weekDays } } });

  // 7-day finance totals
  const weekTx = await prisma.transaction.findMany({ where: { userId, day: { in: lastNDays(7) } } });
  const weekIncome = weekTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const weekExpense = weekTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  return NextResponse.json({
    today,
    nowMinute,
    currentBlock,
    nextBlock,
    todayBlocks,
    tasks: { dueToday: dueToday.length, overdue: overdue.length, next: tasks.slice(0, 5) },
    finance: {
      todayIncome: txToday.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
      todayExpense: txToday.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
      txCountToday: txToday.length,
      weekIncome,
      weekExpense,
    },
    water: { todayMl, target: waterTarget, glassMl: settingsSafe.glassMl },
    habits: { total: habits.length, done: habitCheckins.length, items: habits.map((h) => ({ ...h, done: habitCheckins.some((c) => c.habitId === h.id) })) },
    workout: { todayCount: workoutsToday.length, weekCount: weekWorkouts.length, target: settingsSafe.workoutPerWeek },
    goals: goals.map((g) => ({ id: g.id, name: g.name, icon: g.icon, progress: g.targetAmount ? g.currentAmount / g.targetAmount : 0, currentAmount: g.currentAmount, targetAmount: g.targetAmount })),
    latestEval: latestEval ? { healthScore: latestEval.healthScore, createdAt: latestEval.createdAt } : null,
  });
}