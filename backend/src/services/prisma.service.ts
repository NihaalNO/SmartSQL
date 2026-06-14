import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

/**
 * Returns a cached PrismaClient instance.
 * Uses a singleton pattern to avoid multiple connections.
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : undefined,
    });
  }
  return prisma;
}

/**
 * Gracefully disconnects the Prisma client.
 * Call this before process exit.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
