import { PrismaClient } from "@/generated/prisma/client";

import { resolveDatabaseUrl } from "@/lib/database-url";
import { createSqliteAdapter } from "@/lib/sqlite-adapter";

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
 * The URL is resolved here so the CLI (prisma.config.ts) and the app always
 * point at the same database, whatever the current working directory is.
 */
const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL, process.cwd());

function createClient() {
  return new PrismaClient({
    adapter: createSqliteAdapter(databaseUrl),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
