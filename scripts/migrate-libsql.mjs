#!/usr/bin/env node
/**
 * Apply the Prisma migrations to a hosted libSQL (Turso) database.
 *
 * Why this exists
 * ---------------
 * The Prisma schema engine only understands `file:` connection strings. It
 * rejects `libsql://` with P1013 ("the scheme is not recognized"), even
 * though the Prisma 7 driver adapter `@prisma/adapter-libsql` speaks it
 * perfectly well at runtime. Prisma's own documentation says as much:
 * schema changes for Turso go through `prisma migrate diff` plus the Turso
 * CLI.
 *
 * The Turso CLI is not available inside a Vercel build, and `migrate diff`
 * only generates SQL — it does not apply it. But the migrations in
 * `prisma/migrations/` are plain SQLite, and libSQL is SQLite: the same SQL
 * runs unchanged over the wire. So this script applies them directly with
 * `@libsql/client`, which is the same library the runtime adapter uses.
 *
 * The migration files stay the single source of truth. A migration created
 * with `prisma migrate dev` is picked up here automatically.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..");
const migrationsDir = process.env.PROJECTSCOPE_MIGRATIONS_DIR
  ? path.resolve(process.env.PROJECTSCOPE_MIGRATIONS_DIR)
  : path.join(rootDir, "prisma", "migrations");

const TRACKING_TABLE = "_projectscope_migrations";

function fail(message, error) {
  console.error(`\n[projectscope] ${message}`);
  if (error) console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function readMigrations() {
  if (!existsSync(migrationsDir)) {
    fail(`No migrations directory at ${migrationsDir}.`);
  }

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const file = path.join(migrationsDir, name, "migration.sql");
      if (!existsSync(file)) {
        fail(`The migration "${name}" has no migration.sql.`);
      }
      const sql = readFileSync(file, "utf8");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex").slice(0, 32) };
    });
}

async function main() {
  const url = (process.env.DATABASE_URL ?? "").trim();
  const authToken =
    process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

  if (!url) {
    fail("DATABASE_URL is not set.");
  }
  if (!url.startsWith("libsql:") && !url.startsWith("file:")) {
    fail(
      `Unsupported DATABASE_URL scheme in "${url}".\n` +
        "        Use a file: URL for local development or a libsql: URL for a hosted database.",
    );
  }

  const migrations = readMigrations();
  if (migrations.length === 0) {
    console.log("[projectscope] No migrations to apply.");
    return;
  }

  const client = createClient({ url, authToken });

  try {
    try {
      await client.execute("SELECT 1");
    } catch (error) {
      fail(
        "The hosted database could not be reached.\n" +
          "        Check that DATABASE_URL points at an existing database and that " +
          "TURSO_AUTH_TOKEN is the token for it.",
        error,
      );
    }

    await client.execute(
      `CREATE TABLE IF NOT EXISTS "${TRACKING_TABLE}" (
         "name" TEXT PRIMARY KEY NOT NULL,
         "checksum" TEXT NOT NULL,
         "applied_at" TEXT NOT NULL
       )`,
    );

    const applied = new Map();
    const rows = await client.execute(
      `SELECT "name", "checksum" FROM "${TRACKING_TABLE}"`,
    );
    for (const row of rows.rows) {
      applied.set(String(row.name), String(row.checksum));
    }

    let count = 0;
    for (const migration of migrations) {
      const known = applied.get(migration.name);

      if (known !== undefined) {
        if (known !== migration.checksum) {
          console.warn(
            `[projectscope] The migration "${migration.name}" has changed since it was applied. ` +
              "It will not be re-applied. Add a new migration instead of editing an applied one.",
          );
        }
        continue;
      }

      console.log(`[projectscope] Applying ${migration.name}…`);

      /*
       * The migration and its bookkeeping row are applied in one transaction,
       * so a failure can never leave the database and the tracking table
       * disagreeing. If a statement fails the transaction is rolled back, so
       * a re-deploy starts from the last migration that applied cleanly.
       */
      const transaction = await client.transaction("write");
      try {
        await transaction.executeMultiple(migration.sql);
        await transaction.execute({
          sql: `INSERT INTO "${TRACKING_TABLE}" ("name", "checksum", "applied_at") VALUES (?, ?, ?)`,
          args: [migration.name, migration.checksum, new Date().toISOString()],
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback().catch(() => undefined);
        fail(
          `The migration "${migration.name}" failed and was rolled back. The database was left at ` +
            "the last migration that applied cleanly. Fix the cause and deploy again.",
          error,
        );
      }

      count += 1;
    }

    if (count === 0) {
      console.log(`[projectscope] The database is already up to date (${migrations.length} migration(s)).`);
    } else {
      console.log(`[projectscope] Applied ${count} migration(s).`);
    }
  } finally {
    client.close();
  }
}

await main();
