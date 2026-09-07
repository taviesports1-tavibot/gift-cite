import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export function getPrisma() {
  const prisma = globalForPrisma.prisma ?? new PrismaClient();
  globalForPrisma.prisma = prisma;
  return prisma;
}
export async function databaseHealth() {
  const prisma = getPrisma();
  const started = Date.now();
  await Promise.all([prisma.gameSnapshot.count(), prisma.giftMapping.count(), prisma.streamSession.count()]);
  return { ok: true, latencyMs: Date.now() - started };
}
