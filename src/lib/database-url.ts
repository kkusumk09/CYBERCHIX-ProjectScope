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

/**
 * Build the URL the Prisma CLI should use.
 *
 * For a hosted libSQL/Turso database the CLI needs the auth token. The
 * runtime adapter takes the token as a separate option, but tools that only
 * understand a connection string — `prisma migrate diff --from-url`, the
 * Turso CLI — need it folded into the URL as the `authToken` query parameter.
 *
 * Note that the Prisma *schema engine* still refuses a `libsql://` URL, so
 * this is not used to run migrations against a hosted database. Those are
 * applied by `scripts/migrate-libsql.mjs` instead.
 *
 * The token is never logged or printed.
 */
export function resolveMigrationUrl(raw: string | undefined, rootDir: string): string {
  const url = resolveDatabaseUrl(raw, rootDir);
  if (!url.startsWith("libsql:")) return url;

  if (/[?&]authToken=/.test(url)) return url;

  const token =
    process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
  if (!token) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}authToken=${encodeURIComponent(token)}`;
}
