import { prisma } from "@/lib/db";

/**
 * Single-user mode: login/logout removed.
 * All API routes keep calling getAuthUserId() — now it always resolves
 * to the default user (find-or-create), no session/cookie involved.
 */
const DEFAULT_EMAIL = "demo@lifec.id";
const DEFAULT_NAME = "Fatih";

let cachedId: string | null = null;

export async function getAuthUserId(): Promise<string> {
  if (cachedId) return cachedId;
  let user = await prisma.user.findUnique({ where: { email: DEFAULT_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: DEFAULT_EMAIL, name: DEFAULT_NAME, passwordHash: "-" },
    });
  }
  cachedId = user.id;
  return user.id;
}
