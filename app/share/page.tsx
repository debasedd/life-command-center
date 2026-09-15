import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ruleCategorize } from "@/lib/ai-categorize";
import { wibToday } from "@/lib/wib";

/**
 * Share target untuk iOS Shortcut:
 * /share?text=<teks yang di-share>
 * - ada nominal → transaksi (INCOME/EXPENSE otomatis) → redirect /finance
 * - teks biasa → tugas baru → redirect /tasks
 * Auto-save tanpa UI: Shortcut cukup buka URL ini.
 */

function parseAmount(t: string): number | null {
  const s = t.toLowerCase();
  const jt = s.match(/([\d.,]+)\s*(juta|jt)\b/);
  const rb = s.match(/([\d.,]+)\s*(rb|ribu|k)\b/);
  const rp = s.match(/rp\s*([\d.,]+)/);
  const plain = s.match(/(?:^|\s)(\d{4,9})(?:\s|$|[.,]\s)/);
  const num = (v: string) => Number(v.replace(/\./g, "").replace(/,/g, "."));
  if (jt) return Math.round(num(jt[1]) * 1_000_000);
  if (rb) return Math.round(num(rb[1]) * 1000);
  if (rp) {
    const v = num(rp[1]);
    if (v >= 100) return Math.round(v);
  }
  if (plain) return Number(plain[1]);
  return null;
}

const INCOME_WORDS = ["gaji", "masuk", "terima", "dapat uang", "transfer masuk", "setoran", "thr", "bonus", "hadiah"];

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; title?: string }>;
}) {
  const userId = await getAuthUserId();
  const sp = await searchParams;
  const text = (sp.text || sp.title || "").trim();

  if (!text) {
    return (
      <div className="mx-auto max-w-md min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f7f8f8]">Belum ada teks</h1>
        <p className="text-sm text-[#8a8f98] mt-2 leading-relaxed">
          Shortcut iOS belum ngirim teks. Cek action Text → pilih Shortcut Input.
        </p>
        <a href="/profile" className="mt-4 text-xs text-[#7170ff] border border-[#7170ff]/30 rounded-md px-3 py-1.5 font-medium">
          Buka LifeCC
        </a>
      </div>
    );
  }

  const amount = parseAmount(text);

  if (amount && amount >= 500) {
    const lower = text.toLowerCase();
    const type = INCOME_WORDS.some((w) => lower.includes(w)) ? "INCOME" : "EXPENSE";
    const categories = await prisma.category.findMany({ where: { userId } });
    let categoryId: string | null = null;
    if (categories.length > 0) {
      const r = ruleCategorize(text, type, categories);
      categoryId = r.categoryId;
      if (!categoryId) {
        const misc = categories.find((c) => c.name === "Lain-lain");
        categoryId = (misc || categories[0]).id;
      }
    }
    await prisma.transaction.create({
      data: {
        userId,
        type,
        amount,
        categoryId,
        note: text
          .replace(/rp\s*[\d.,]+/gi, "")
          .replace(/\b\d+([.,]\d+)?\s*(juta|jt|rb|ribu|k)\b/gi, "")
          .trim()
          .slice(0, 120) || text.slice(0, 120),
        day: wibToday(),
        aiCategorized: true,
      },
    });
    redirect("/finance");
  }

  const firstLine = text.split("\n").find((l: string) => l.trim()) || text;
  await prisma.task.create({
    data: {
      userId,
      title: firstLine.slice(0, 80),
      description: text.slice(0, 5000),
      priority: "MEDIUM",
    },
  });
  redirect("/tasks");
}
