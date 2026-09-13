/** Rule-based auto-categorization — offline fallback & confidence scorer.
 *  Used as deterministic fallback when LLM is unavailable (no API key / offline). */

export const KEYWORD_RULES: { category: string; keywords: string[] }[] = [
  { category: "Makanan & Minuman", keywords: ["nasi", "makan", "minum", "kopi", "cafe", "resto", "warteg", "padang", "sate", "bakso", "mie", "ayam", "geprek", "boba", "es teh", "snack", "jajan", "sushi", "burger", "pizza", "sarapan", "makan siang", "makan malam", "lunch", "dinner", "kantin"] },
  { category: "Transportasi", keywords: ["gojek", "grab", "ojol", "ojek", "gojek", "maxim", "bus", "krl", "mrt", "transjakarta", "bensin", "pertalite", "pertamax", "parkir", "tol", "taksi", "travel", "kereta", "angkot"] },
  { category: "Sekolah & Alat Tulis", keywords: ["buku", "pulpen", "pensil", "spidol", "arsip", "map", "fotokopi", "print", "lamaran", "tugas", "pr", "uang sekolah", "spm", "spp", "seragam", "atasan", "laptop", "kalkulator"] },
  { category: "Hiburan", keywords: ["game", "steam", "netflix", "spotify", "youtube premium", "bioskop", "cgv", "xxi", "main", "nongkrong", "billiard", "karaoke", "gacha", "top up", "diamond", "uc", "skin"] },
  { category: "Kesehatan", keywords: ["obat", "dokter", "klinik", "puskesmas", "apotek", "vitamin", "gym", "member", "vaksin", "periksa"] },
  { category: "Tabungan", keywords: ["nabung", "tabung", "setor", "deposit", "invest", "reksadana", "saham", "emas"] },
  { category: "Uang Masuk", keywords: ["uang jajan", "gaji", " THR", "bonus", "hadiah", "dapat uang", "transfer masuk", "jastip", "freelance", "campaign", "reward", "cashback", "gaji bulanan"] },
];

export function ruleCategorize(
  note: string,
  type: "INCOME" | "EXPENSE",
  categories: { id: string; name: string }[]
): { categoryId: string | null; confidence: number; source: "RULE" | "NONE" } {
  const norm = note.toLowerCase();

  // INCOME: only match income-related rules (prevents "uang jajan" → Makanan bug)
  if (type === "INCOME") {
    const incomeRule = KEYWORD_RULES.find((r) => r.category === "Uang Masuk");
    if (norm.includes("tabung") || norm.includes("nabung") || norm.includes("setor")) {
      const cat = categories.find((c) => c.name === "Tabungan");
      if (cat) return { categoryId: cat.id, confidence: 0.8, source: "RULE" };
    }
    if (incomeRule) {
      let score = 0;
      for (const kw of incomeRule.keywords) if (norm.includes(kw.toLowerCase().trim())) score += 1;
      const cat = categories.find((c) => c.name === "Uang Masuk");
      if (score > 0 && cat) return { categoryId: cat.id, confidence: Math.min(0.9, 0.6 + score * 0.1), source: "RULE" };
    }
    const cat = categories.find((c) => c.name === "Uang Masuk");
    if (cat) return { categoryId: cat.id, confidence: 0.5, source: "RULE" };
    return { categoryId: categories[0]?.id ?? null, confidence: 0.3, source: "RULE" };
  }

  let best: { id: string; name: string; score: number } | null = null;

  for (const rule of KEYWORD_RULES) {
    if (rule.category === "Uang Masuk") continue; // income-only rule
    let score = 0;
    for (const kw of rule.keywords) {
      if (norm.includes(kw.toLowerCase().trim())) score += 1;
    }
    if (score > 0) {
      const cat = categories.find((c) => c.name === rule.category);
      if (cat && (!best || score > best.score)) best = { ...cat, score };
    }
  }

  if (best) return { categoryId: best.id, confidence: Math.min(0.9, 0.6 + best.score * 0.1), source: "RULE" };
  return { categoryId: null, confidence: 0, source: "NONE" };
}

/** Few-shot context from past user corrections. */
export function correctionsPrompt(corrections: { note: string; category: string }[]): string {
  if (corrections.length === 0) return "";
  const lines = corrections.slice(-10).map((c) => `- "${c.note}" → ${c.category}`);
  return `\nContoh koreksi user sebelumnya (pelajari polanya):\n${lines.join("\n")}`;
}