import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendToUser } from "@/lib/push";
import { wibToday, wibMinuteOfDay, wibWeekday, lastNDays, dayOffset } from "@/lib/wib";

/**
 * CRON endpoint — hit by an external scheduler every 5 minutes
 * (Vercel Cron / cron-job.org / GitHub Actions). Protected by CRON_SECRET.
 * Responsibilities:
 *  1. Dispatch due ScheduledNotifications (respect quiet hours)
 *  2. Generate periodic reminders: water, workout, daily recap (per user prefs)
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const dispatched: string[] = [];

  // 0) Expire stale rows: reminder yang telat > 6 jam tidak dikirim (basi) — cegah banjir backlog.
  const staleCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const expired = await prisma.scheduledNotification.updateMany({
    where: { sentAt: null, sendAt: { lt: staleCutoff } },
    data: { sentAt: now },
  });

  // 1) Dispatch due scheduled notifications
  const due = await prisma.scheduledNotification.findMany({
    where: { sentAt: null, sendAt: { lte: now } },
    take: 50,
  });
  for (const n of due) {
    const settings = await prisma.settings.findUnique({ where: { userId: n.userId } });
    if (settings && inQuietHours(wibMinuteOfDay(now), settings.quietStartMinute, settings.quietEndMinute) && n.type !== "MILESTONE") {
      // Postpone to end of quiet hours
      await prisma.scheduledNotification.update({
        where: { id: n.id },
        data: { sendAt: new Date(now.getTime() + 15 * 60 * 1000) },
      });
      continue;
    }
    const result = await sendToUser(n.userId, { title: n.title, body: n.body, tag: n.type });
    await prisma.scheduledNotification.update({ where: { id: n.id }, data: { sentAt: now } });
    dispatched.push(`${n.type}:${result.sent}sent`);
  }

  // 2) Generate conditional periodic reminders (idempotent per 30-min window)
  const today = wibToday();
  const minute = wibMinuteOfDay(now);
  const generated: string[] = [];

  const prefs = await prisma.notificationPref.findMany({ where: { enabled: true } });
  const users = [...new Set(prefs.map((p) => p.userId))];

  for (const userId of users) {
    const userPrefs = prefs.filter((p) => p.userId === userId);
    const settings = await prisma.settings.findUnique({ where: { userId } });

    for (const pref of userPrefs) {
      // Fire window: pref.minuteOfDay <= current minute < +30, and not already fired today for this type/hour
      if (minute < pref.minuteOfDay || minute >= pref.minuteOfDay + 30) continue;
      const windowStart = new Date(now.getTime() - 31 * 60 * 1000);
      const already = await prisma.scheduledNotification.findFirst({
        where: { userId, type: pref.type, createdAt: { gte: windowStart } },
      });
      if (already) continue;

      if (pref.type === "WATER_REMINDER") {
        const target = settings?.waterTargetMl ?? 2000;
        const sum = await prisma.waterLog.aggregate({ where: { userId, day: today }, _sum: { amountMl: true } });
        const ml = sum._sum.amountMl || 0;
        if (ml >= target) continue; // smart: skip if target reached
        const glasses = Math.round(ml / (settings?.glassMl ?? 250));
        const targetGlasses = Math.round(target / (settings?.glassMl ?? 250));
        await prisma.scheduledNotification.create({
          data: { userId, type: "WATER_REMINDER", sendAt: now, title: "Waktunya minum", body: `Hari ini baru ${glasses}/${targetGlasses} gelas. Yuk tambah satu gelas!` },
        });
        generated.push(`water:${userId.slice(0, 6)}`);
      }

      if (pref.type === "DAILY_RECAP") {
        // Recap tasks/water/workout/finance for today
        const [openTasks, waterSum, workouts, txs] = await Promise.all([
          prisma.task.count({ where: { userId, status: { not: "DONE" } } }),
          prisma.waterLog.aggregate({ where: { userId, day: today }, _sum: { amountMl: true } }),
          prisma.workout.count({ where: { userId, day: today } }),
          prisma.transaction.findMany({ where: { userId, day: today } }),
        ]);
        const target = settings?.waterTargetMl ?? 2000;
        const glasses = Math.round((waterSum._sum.amountMl || 0) / (settings?.glassMl ?? 250));
        const income = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
        await prisma.scheduledNotification.create({
          data: {
            userId, type: "DAILY_RECAP", sendAt: now,
            title: "Rekap hari ini",
            body: `Tugas aktif: ${openTasks} • Air: ${glasses} gelas • Olahraga: ${workouts > 0 ? "selesai" : "belum"} • Uang: +${income.toLocaleString("id-ID")} / -${expense.toLocaleString("id-ID")}`,
          },
        });
        generated.push(`recap:${userId.slice(0, 6)}`);
      }

      if (pref.type === "WORKOUT_REMINDER") {
        const target = settings?.workoutPerWeek ?? 3;
        const weekDays = lastNDays(7);
        const weekCount = await prisma.workout.count({ where: { userId, day: { in: weekDays } } });
        const todayCount = await prisma.workout.count({ where: { userId, day: today } });
        if (todayCount > 0 || weekCount >= target) continue; // smart skip
        await prisma.scheduledNotification.create({
          data: { userId, type: "WORKOUT_REMINDER", sendAt: now, title: "Belum olahraga hari ini", body: `Minggu ini baru ${weekCount}/${target} sesi. 30 menit jalan/joging pun cukup!` },
        });
        generated.push(`workout:${userId.slice(0, 6)}`);
      }

      if (pref.type === "MISSED_DEADLINE") {
        // Scan overdue tasks once per day (fires within first 30 min window after pref minute)
        const dayStartISO = new Date(today + "T00:00:00+07:00");
        const alreadyToday = await prisma.scheduledNotification.findFirst({
          where: { userId, type: "MISSED_DEADLINE", createdAt: { gte: dayStartISO } },
        });
        if (alreadyToday) continue;
        const overdue = await prisma.task.findMany({
          where: { userId, status: { not: "DONE" }, deadline: { lt: dayStartISO } },
          take: 3,
        });
        if (overdue.length === 0) continue;
        await prisma.scheduledNotification.create({
          data: { userId, type: "MISSED_DEADLINE", sendAt: now, title: "Ada tugas terlambat", body: `${overdue.length} tugas lewat deadline: ${overdue.map((t) => `"${t.title}"`).join(", ")}. Prioritaskan ulang!` },
        });
        generated.push(`missed:${userId.slice(0, 6)}`);
      }
    }
  }

  return NextResponse.json({ ok: true, dispatched: dispatched.length, generated: generated.length, expired: expired.count, detail: { dispatched, generated } });
}

function inQuietHours(minute: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start > end) return minute >= start || minute < end; // wraps midnight
  return minute >= start && minute < end;
}