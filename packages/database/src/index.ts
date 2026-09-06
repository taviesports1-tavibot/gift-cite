import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export function getPrisma() {
  const prisma = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  return prisma;
}
export async function databaseHealth() {
  const prisma = getPrisma();
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, latencyMs: Date.now() - started };
}
