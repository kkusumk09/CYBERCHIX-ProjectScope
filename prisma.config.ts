import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "prisma/config";

import { resolveMigrationUrl } from "./src/lib/database-url";

/**
 * Prisma CLI configuration (Prisma 7 style).
 *
 * Prisma 7 no longer loads `.env` files by itself, so we load them here with
 * the same precedence Next.js uses:
 *
 *   real environment variables  >  .env.local  >  .env
 */
function loadEnvFiles(rootDir: string) {
  const files = [".env", ".env.local"];
  const loaded: Record<string, string> = {};

  for (const file of files) {
    const full = path.join(rootDir, file);
    if (!existsSync(full)) continue;
    try {
      process.loadEnvFile(full);
    } catch {
      // A malformed .env must not stop the CLI; the real environment wins anyway.
    }
  }

  // `process.loadEnvFile` may not override an already-set variable, so make
  // the precedence explicit for the keys we care about.
  for (const file of files) {
    const full = path.join(rootDir, file);
    if (!existsSync(full)) continue;
    const content = readFileSync(full, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const key = match[1];
      let value = match[2] ?? "";
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (loaded[key] === undefined) loaded[key] = value;
    }
  }

  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const rootDir = process.cwd();
loadEnvFiles(rootDir);

export default defineConfig({
  schema: path.join(rootDir, "prisma", "schema.prisma"),
  datasource: {
    url: resolveMigrationUrl(process.env.DATABASE_URL, rootDir),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
