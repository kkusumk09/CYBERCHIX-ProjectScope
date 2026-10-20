import { z } from "zod";

/**
 * Safe JSON helpers.
 *
 * SQLite has no native JSON column type in Prisma, so structured values are
 * stored as strings. These helpers make (de)serialisation explicit and safe:
 * a corrupt row degrades to a fallback instead of crashing a page.
 */

export function parseJson<T>(raw: string | null | undefined, fallback: T, schema?: z.ZodType<T>): T {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!schema) return value as T;
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "null";
  } catch {
    return "null";
  }
}
