import { prisma } from "@/lib/db";

/** Model AI pilihan user (Settings.aiModel). undefined = pakai default server. */
export async function resolveAiModel(userId: string): Promise<string | undefined> {
  try {
    const s = await prisma.settings.findUnique({ where: { userId }, select: { aiModel: true } });
    const m = s?.aiModel?.trim();
    return m || undefined;
  } catch {
    return undefined;
  }
}
