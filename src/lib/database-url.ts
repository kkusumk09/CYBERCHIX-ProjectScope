import path from "node:path";

/**
 * Resolve the SQLite database URL.
 *
 * Prisma resolves a relative `file:` URL against the folder that contains
 * `schema.prisma`. This helper makes that explicit so the CLI (via
 * `prisma.config.ts`) and the running app (via `src/lib/db.ts`) always point
 * at the same file, whatever the current working directory is.
 */
export const DEFAULT_DATABASE_URL = "file:./dev.db";

export function resolveDatabaseUrl(raw: string | undefined, rootDir: string): string {
  const value = (raw ?? DEFAULT_DATABASE_URL).trim();
  if (!value.startsWith("file:")) return value;

  const filePath = value.slice("file:".length);
  if (!filePath || filePath === ":memory:" || filePath.startsWith(":memory:")) return value;
  if (path.isAbsolute(filePath)) return value;

  const absolute = path.join(rootDir, "prisma", filePath).replace(/\\/g, "/");
  return `file:${absolute}`;
}
