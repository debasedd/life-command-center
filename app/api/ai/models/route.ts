import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { DEFAULT_MODEL } from "@/lib/ai-homework";

/**
 * GET /api/ai/models — daftar model yang tersedia di provider (OpenAI-compatible).
 * Sumber utama: {AI_BASE_URL}/models. Jika provider tidak expose, kembalikan
 * daftar fallback + default supaya UI tetap bisa memilih.
 */
const FALLBACK = [
  "openrouter/z-ai/glm-5.3-flash",
  "openrouter/z-ai/glm-4.5-air",
  "openrouter/anthropic/claude-haiku-4.5",
  "openrouter/openai/gpt-5.1-mini",
];

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const base = process.env.AI_BASE_URL || "https://r93y57q.abc-tunnel.us/v1";
  const key = process.env.AI_API_KEY || "";

  let models: string[] = [];
  let source = "fallback";
  try {
    const res = await fetch(`${base}/models`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: { id?: string }[]; models?: { id?: string }[] };
      const list = (data.data || data.models || [])
        .map((m) => m.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 120);
      if (list.length) {
        models = [...new Set(list)].sort();
        source = "provider";
      }
    }
  } catch {
    // provider tidak tersedia — pakai fallback
  }

  if (!models.length) models = FALLBACK.filter((m) => m !== DEFAULT_MODEL);
  if (!models.includes(DEFAULT_MODEL)) models.unshift(DEFAULT_MODEL);

  return NextResponse.json({ models, default: DEFAULT_MODEL, source });
}
