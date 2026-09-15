/** AI Homework Solver — foto soal → ekstrak teks → kerjakan step-by-step.
 *  Vision via 9router (OpenAI-compatible), auth-free fallback untuk lokal dev. */

const BASE_URL = process.env.AI_BASE_URL || "https://r93y57q.abc-tunnel.us/v1";
const API_KEY = process.env.AI_API_KEY || "";
const MODEL = process.env.AI_MODEL || "openrouter/z-ai/glm-5.3-flash";

export interface ExtractResult {
  ok: boolean;
  title?: string;
  subject?: string;
  question?: string; // soal lengkap hasil OCR
  error?: string;
}

export interface SolveResult {
  ok: boolean;
  answer?: string; // markdown pembahasan
  error?: string;
}

const EXTRACT_SYSTEM = `Kamu asisten yang mengekstrak soal tugas sekolah dari foto.
Baca foto itu, lalu balas HANYA JSON:
{"title": "<judul singkat tugas, max 8 kata>", "subject": "<mapel jika terlihat, else null>", "question": "<salin utuh semua soal & angka dari foto, pertahankan format>"}
Jika foto bukan soal tugas, balas {"title": null, "subject": null, "question": null}.`;

const SOLVE_SYSTEM = `Kamu guru privat Indonesia yang mengerjakan soal tugas sekolah (SD-SMA).
Untuk setiap soal, tulis pembahasan lengkap dalam bahasa Indonesia dengan format markdown:

## Soal 1: <ringkasan singkat soal>

**Diketahui:** <data-data yang diketahui>
**Ditanya:** <apa yang dicari>

**Penyelesaian:**
<langkah demi langkah, jelas dan runtut, sertakan rumus & perhitungan>

**Jawaban:** <jawaban akhir, ditebalkan>

---

Kerjakan SEMUA soal yang ada. Jangan melewatkan satu pun. Jika soal tidak lengkap/terpotong, sebutkan asumsi yang kamu pakai. Jangan memberi kode program kecuali diminta.`;

async function chat(body: Record<string, unknown>, timeoutMs = 120000): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({ model: MODEL, ...body }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error(`[ai-homework] chat failed: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
      return null;
    }
    const text = await res.text();
    // 9router kadang menambahkan whitespace/`data: [DONE]` di sekitar body JSON — ambil objek utamanya saja
    let data: {
      choices?: { message?: { content?: string | null; reasoning?: string | null } }[];
    };
    try {
      data = JSON.parse(text);
    } catch {
      const start = text.indexOf('{"id"');
      const end = text.indexOf("data: [DONE]");
      const slice = start !== -1 ? text.slice(start, end !== -1 ? end : undefined).trim() : text;
      data = JSON.parse(slice);
    }
    const msg = data.choices?.[0]?.message;
    // glm thinking models put prose in reasoning when content is null; prefer content
    return typeof msg?.content === "string" && msg.content.trim() ? msg.content : (msg?.reasoning ?? null);
  } catch (e) {
    console.error("[ai-homework] chat error:", e instanceof Error ? e.message : e);
    return null;
  }
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Step 1: foto → data soal. */
export async function extractFromPhoto(base64: string, mime: string): Promise<ExtractResult> {
  const content = await chat(
    {
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Ekstrak soal dari foto ini." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    },
    60000
  );
  if (!content) return { ok: false, error: "AI tidak merespon saat membaca foto" };
  const parsed = parseJsonLoose(content);
  if (!parsed || !parsed.title || !parsed.question) {
    return { ok: false, error: "Foto tidak terbaca sebagai soal tugas. Coba foto ulang lebih dekat & terang." };
  }
  return {
    ok: true,
    title: String(parsed.title).slice(0, 120),
    subject: parsed.subject ? String(parsed.subject).slice(0, 40) : undefined,
    question: String(parsed.question),
  };
}

/** Step 2: soal → pembahasan lengkap. timeoutMs default 50s (serverless-safe). */
export async function solveQuestion(question: string, timeoutMs = 50000): Promise<SolveResult> {
  const content = await chat(
    {
      messages: [
        { role: "system", content: SOLVE_SYSTEM },
        { role: "user", content: `Kerjakan tugas berikut:\n\n${question}` },
      ],
      max_tokens: 4000,
      temperature: 0.2,
    },
    timeoutMs
  );
  if (!content || content.trim().length < 30) {
    return { ok: false, error: "AI gagal mengerjakan soal. Coba lagi nanti." };
  }
  return { ok: true, answer: content };
}

/** Pisahkan dataURL → {base64, mime}. */
export function parseDataUrl(dataUrl: string): { base64: string; mime: string } | null {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}