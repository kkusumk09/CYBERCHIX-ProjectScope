#!/usr/bin/env node
/**
 * Apply the database migrations for whichever backend is configured.
 *
 *   file:./dev.db   → the Prisma CLI (the local development path)
 *   libsql://…      → scripts/migrate-libsql.mjs, because the Prisma schema
 *                      engine rejects a libsql:// connection string
 *
 * Both paths read the same files in `prisma/migrations/`, so a migration
 * written once is applied by either.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..");

const url = (process.env.DATABASE_URL ?? "").trim();

if (!url) {
  console.error("[projectscope] DATABASE_URL is not set.");
  process.exit(1);
}

if (url.startsWith("libsql:")) {
  const runner = path.join(here, "migrate-libsql.mjs");
  const result = spawnSync(process.execPath, [runner], { stdio: "inherit", cwd: rootDir });
  process.exit(result.status ?? 1);
}

if (url.startsWith("file:")) {
  /*
   * Run the Prisma CLI through Node directly. `npx` is a shell script and
   * `node_modules/.bin/prisma` is a `.cmd` file on Windows, and neither can
   * be spawned without a shell — this is the same approach the test setup
   * uses.
   */
  const prismaCli = path.join(rootDir, "node_modules", "prisma", "build", "index.js");
  if (!existsSync(prismaCli)) {
    console.error(
      "[projectscope] The Prisma CLI was not found. Run `npm install` before migrating.",
    );
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (result.error) {
    console.error("[projectscope] The Prisma CLI could not be started:", result.error.message);
  }
  process.exit(result.status ?? 1);
}

console.error(
  `[projectscope] Unsupported DATABASE_URL scheme in "${url}". ` +
    "Use a file: URL for local development or a libsql: URL for a hosted database.",
);
process.exit(1);
