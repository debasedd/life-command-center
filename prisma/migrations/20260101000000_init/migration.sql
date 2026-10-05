-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('SCHOOL', 'LESSON', 'ACTIVITY', 'PERSONAL');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Intensity" AS ENUM ('RINGAN', 'SEDANG', 'BERAT');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('TASK_DEADLINE', 'WORKOUT_REMINDER', 'WATER_REMINDER', 'DAILY_RECAP', 'WEEKLY_EVAL', 'MISSED_DEADLINE', 'MILESTONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "deadline" TIMESTAMP(3),
    "estimatedMinutes" INTEGER,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "photoData" TEXT,
    "photoMime" TEXT,
    "aiAnswer" TEXT,
    "aiAnswerAt" TIMESTAMP(3),
    "aiStatus" TEXT NOT NULL DEFAULT 'NONE',
    "aiError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "BlockType" NOT NULL DEFAULT 'SCHOOL',
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "weekday" INTEGER,
    "date" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📦',
    "color" TEXT NOT NULL DEFAULT '#71717a',

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "note" TEXT,
    "day" TEXT NOT NULL,
    "aiCategorized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "deadline" TEXT,
    "monthlyCommitment" INTEGER,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "icon" TEXT NOT NULL DEFAULT '🎯',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentProfile" (
    "userId" TEXT NOT NULL,
    "monthlyInvestment" INTEGER NOT NULL DEFAULT 0,
    "assets" JSONB NOT NULL DEFAULT '[]',
    "years" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "intensity" "Intensity" NOT NULL DEFAULT 'SEDANG',
    "day" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "bedMinute" INTEGER NOT NULL,
    "wakeMinute" INTEGER NOT NULL,
    "quality" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SleepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✅',
    "targetPerWeek" INTEGER NOT NULL DEFAULT 7,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPref" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minuteOfDay" INTEGER NOT NULL DEFAULT 540,

    CONSTRAINT "NotificationPref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "userId" TEXT NOT NULL,
    "waterTargetMl" INTEGER NOT NULL DEFAULT 2000,
    "glassMl" INTEGER NOT NULL DEFAULT 250,
    "workoutPerWeek" INTEGER NOT NULL DEFAULT 3,
    "quietStartMinute" INTEGER NOT NULL DEFAULT 1320,
    "quietEndMinute" INTEGER NOT NULL DEFAULT 360,
    "aiModel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AiCorrection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_deadline_idx" ON "Task"("userId", "deadline");

-- CreateIndex
CREATE INDEX "ScheduleBlock_userId_weekday_idx" ON "ScheduleBlock"("userId", "weekday");

-- CreateIndex
CREATE INDEX "ScheduleBlock_userId_date_idx" ON "ScheduleBlock"("userId", "date");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_day_idx" ON "Transaction"("userId", "day");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "SavingsGoal_userId_status_idx" ON "SavingsGoal"("userId", "status");

-- CreateIndex
CREATE INDEX "GoalDeposit_userId_goalId_idx" ON "GoalDeposit"("userId", "goalId");

-- CreateIndex
CREATE INDEX "Workout_userId_day_idx" ON "Workout"("userId", "day");

-- CreateIndex
CREATE INDEX "WaterLog_userId_day_idx" ON "WaterLog"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "SleepLog_userId_day_key" ON "SleepLog"("userId", "day");

-- CreateIndex
CREATE INDEX "Habit_userId_archived_idx" ON "Habit"("userId", "archived");

-- CreateIndex
CREATE INDEX "HabitCheckin_userId_day_idx" ON "HabitCheckin"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "HabitCheckin_habitId_day_key" ON "HabitCheckin"("habitId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPref_userId_type_key" ON "NotificationPref"("userId", "type");

-- CreateIndex
CREATE INDEX "ScheduledNotification_sendAt_sentAt_idx" ON "ScheduledNotification"("sendAt", "sentAt");

-- CreateIndex
CREATE INDEX "ScheduledNotification_userId_idx" ON "ScheduledNotification"("userId");

-- CreateIndex
CREATE INDEX "Evaluation_userId_createdAt_idx" ON "Evaluation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCorrection_userId_idx" ON "AiCorrection"("userId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

