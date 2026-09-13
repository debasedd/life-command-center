import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

function wibToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function dayOffset(days: number): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const email = "demo@lifec.id";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user sudah ada:", email);
    return;
  }

  const user = await prisma.user.create({
    data: { email, name: "Demo Fatih", passwordHash: hashPassword("demo123") },
  });

  await prisma.settings.create({ data: { userId: user.id } });

  for (const [type, minute] of [["TASK_DEADLINE", 420], ["WATER_REMINDER", 780], ["DAILY_RECAP", 1290], ["WORKOUT_REMINDER", 990]] as const) {
    await prisma.notificationPref.create({ data: { userId: user.id, type, minuteOfDay: minute } });
  }

  const catNames: [string, string, string][] = [
    ["Makanan & Minuman", "🍜", "#f59e0b"],
    ["Transportasi", "🚌", "#3b82f6"],
    ["Sekolah & Alat Tulis", "📚", "#8b5cf6"],
    ["Hiburan", "🎮", "#ec4899"],
    ["Kesehatan", "💊", "#10b981"],
    ["Tabungan", "🏦", "#14b8a6"],
    ["Uang Masuk", "💰", "#22c55e"],
    ["Lain-lain", "📦", "#71717a"],
  ];
  const cats: Record<string, string> = {};
  for (const [name, icon, color] of catNames) {
    const c = await prisma.category.create({ data: { userId: user.id, name, icon, color } });
    cats[name] = c.id;
  }

  // Transactions: last 30 days of realistic student finances
  const today = wibToday();
  const txRows: { userId: string; type: "INCOME" | "EXPENSE"; amount: number; categoryId: string; note: string; day: string; aiCategorized: boolean }[] = [];
  for (let i = 30; i >= 0; i--) {
    const day = dayOffset(-i);
    if (i % 7 === 0) {
      txRows.push({ userId: user.id, type: "INCOME", amount: 150000, categoryId: cats["Uang Masuk"], note: "Uang jajan mingguan", day, aiCategorized: true });
    }
    // daily expenses
    txRows.push({ userId: user.id, type: "EXPENSE", amount: 15000 + Math.floor(Math.random() * 10000), categoryId: cats["Makanan & Minuman"], note: "Makan siang kantin", day, aiCategorized: true });
    if (i % 2 === 0) txRows.push({ userId: user.id, type: "EXPENSE", amount: 12000, categoryId: cats["Transportasi"], note: "Ojek ke sekolah", day, aiCategorized: true });
    if (i % 5 === 0) txRows.push({ userId: user.id, type: "EXPENSE", amount: 25000, categoryId: cats["Hiburan"], note: "Top up game", day, aiCategorized: true });
    if (i % 10 === 0) txRows.push({ userId: user.id, type: "EXPENSE", amount: 20000, categoryId: cats["Sekolah & Alat Tulis"], note: "Fotokopi materi", day, aiCategorized: true });
  }
  await prisma.transaction.createMany({ data: txRows });

  // Savings goals
  const goal1 = await prisma.savingsGoal.create({ data: { userId: user.id, name: "Beli Sepeda", targetAmount: 2500000, currentAmount: 750000, icon: "🚲", monthlyCommitment: 200000 } });
  await prisma.savingsGoal.create({ data: { userId: user.id, name: "Dana Darurat", targetAmount: 1000000, currentAmount: 300000, icon: "🛡️", monthlyCommitment: 100000 } });
  // deposits over last 60 days
  const depRows: { userId: string; goalId: string; amount: number; day: string }[] = [];
  for (let i = 60; i >= 0; i -= 7) {
    depRows.push({ userId: user.id, goalId: goal1.id, amount: 50000, day: dayOffset(-i) });
  }
  await prisma.goalDeposit.createMany({ data: depRows });

  // Investment profile
  await prisma.investmentProfile.create({
    data: {
      userId: user.id,
      monthlyInvestment: 300000,
      years: 10,
      assets: [
        { name: "Deposito", pct: 20, rate: 0.04 },
        { name: "Obligasi / RD Pendapatan Tetap", pct: 20, rate: 0.06 },
        { name: "Reksadana Saham / S&P500", pct: 40, rate: 0.1 },
        { name: "Emas", pct: 20, rate: 0.05 },
      ],
    },
  });

  // Tasks
  const soon = new Date(Date.now() + 86400000);
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  const past = new Date(Date.now() - 86400000);
  await prisma.task.createMany({
    data: [
      { userId: user.id, title: "Laporan Fisika - Gerak Parabola", subject: "Fisika", priority: "URGENT", deadline: soon, estimatedMinutes: 90 },
      { userId: user.id, title: "Esai Bahasa Indonesia", subject: "B. Indonesia", priority: "HIGH", deadline: nextWeek },
      { userId: user.id, title: "Latihan soal Trigonometri", subject: "Matematika", priority: "MEDIUM", status: "IN_PROGRESS" },
      { userId: user.id, title: "Tugas lama terlambat", subject: "Sejarah", priority: "HIGH", deadline: past },
    ],
  });

  // Schedule blocks (weekday routine)
  await prisma.scheduleBlock.createMany({
    data: [
      { userId: user.id, title: "Sekolah", type: "SCHOOL", startMinute: 420, endMinute: 900, weekday: 1 },
      { userId: user.id, title: "Sekolah", type: "SCHOOL", startMinute: 420, endMinute: 900, weekday: 2 },
      { userId: user.id, title: "Sekolah", type: "SCHOOL", startMinute: 420, endMinute: 900, weekday: 3 },
      { userId: user.id, title: "Sekolah", type: "SCHOOL", startMinute: 420, endMinute: 900, weekday: 4 },
      { userId: user.id, title: "Sekolah", type: "SCHOOL", startMinute: 420, endMinute: 900, weekday: 5 },
      { userId: user.id, title: "Les Matematika", type: "LESSON", startMinute: 960, endMinute: 1080, weekday: 2 },
      { userId: user.id, title: "Les Bahasa Inggris", type: "LESSON", startMinute: 960, endMinute: 1050, weekday: 4 },
      { userId: user.id, title: "Futsal", type: "ACTIVITY", startMinute: 960, endMinute: 1050, weekday: 6 },
    ],
  });

  // Workouts last 21 days
  const wTypes = ["Jogging", "Push-up & Sit-up", "Futsal", "Sepeda"];
  const wRows: { userId: string; type: string; durationMinutes: number; intensity: "RINGAN" | "SEDANG" | "BERAT"; day: string }[] = [];
  for (let i = 21; i >= 0; i -= 2) {
    wRows.push({
      userId: user.id,
      type: wTypes[Math.floor(Math.random() * wTypes.length)],
      durationMinutes: [20, 30, 45, 60][Math.floor(Math.random() * 4)],
      intensity: "SEDANG",
      day: dayOffset(-i),
    });
  }
  await prisma.workout.createMany({ data: wRows });

  // Water logs last 7 days (some hit target, some not)
  const wLogs: { userId: string; day: string; amountMl: number }[] = [];
  for (let i = 7; i >= 1; i--) {
    const glasses = 5 + Math.floor(Math.random() * 4); // 5-8 glasses
    wLogs.push({ userId: user.id, day: dayOffset(-i), amountMl: glasses * 250 });
  }
  await prisma.waterLog.createMany({ data: wLogs });

  // Sleep logs last 7 days
  const sRows = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    userId: user.id,
    day: dayOffset(-i),
    bedMinute: 1380 + Math.floor(Math.random() * 60) - 30, // ~22:30-23:30 (normalized below)
    wakeMinute: 360 + Math.floor(Math.random() * 60),
    quality: 3 + Math.floor(Math.random() * 2),
  }));
  for (const r of sRows) r.bedMinute = r.bedMinute % 1440;
  await prisma.sleepLog.createMany({ data: sRows });

  // Habits + checkins
  const h1 = await prisma.habit.create({ data: { userId: user.id, name: "Baca 15 menit", icon: "📖", targetPerWeek: 7 } });
  const h2 = await prisma.habit.create({ data: { userId: user.id, name: "Stretching pagi", icon: "🧘", targetPerWeek: 5 } });
  const checkins: { userId: string; habitId: string; day: string }[] = [];
  for (let i = 10; i >= 0; i--) {
    if (i % 3 !== 0) checkins.push({ userId: user.id, habitId: h1.id, day: dayOffset(-i) });
    if (i % 2 === 0) checkins.push({ userId: user.id, habitId: h2.id, day: dayOffset(-i) });
  }
  await prisma.habitCheckin.createMany({ data: checkins });

  console.log("✅ Seed complete. Login: demo@lifec.id / demo123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());