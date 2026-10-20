import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

import { resolveDatabaseUrl } from "@/lib/database-url";

/**
 * Prisma client singleton.
 *
 * Next.js hot-reloads modules in development; without the global cache we
 * would open a new SQLite connection on every reload and eventually hit
 * "too many connections".
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma 7 talks to SQLite through a driver adapter. The URL is resolved
 * here so the CLI (prisma.config.ts) and the app always use the same file.
 */
const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL, process.cwd());

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
