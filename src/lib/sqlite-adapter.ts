import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * The SQLite driver adapter.
 *
 * Prisma 7 talks to SQLite through a driver adapter, and two backends are
 * supported. Both speak the same SQLite dialect, so the Prisma schema and the
 * migrations are identical for each:
 *
 *   file:./dev.db  — a local SQLite file. Used for development.
 *   libsql://…     — a hosted libSQL/Turso database. Required on Vercel,
 *                    where the serverless filesystem is read-only and
 *                    ephemeral, so a local file cannot hold any data.
 *
 * One adapter handles both. `@libsql/client` speaks the local `file:` dialect
 * and the remote HTTP dialect, so the application never has to load a second
 * native module — and the one it does load is built against NAPI, so it keeps
 * working when the Node version changes.
 *
 * This module is shared by the running app (`src/lib/db.ts`) and the seed
 * script (`prisma/seed.ts`) so both always talk to the same database.
 */
export function createSqliteAdapter(url: string) {
  return new PrismaLibSql({
    url,
    authToken:
      process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined,
  });
}
