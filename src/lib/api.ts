import "server-only";

/**
 * Shared helpers for the route handlers.
 *
 * Every route validates its input with Zod and returns errors in one shape:
 *   { error: { code, message, provider?, details? } }
 */
import { ZodError, type ZodType } from "zod";

import { AppError } from "@/lib/errors";

export function jsonError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(error.toJSON(), { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "validation_error",
          message: "The request body did not match the expected shape.",
          details: error.issues
            .slice(0, 8)
            .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("; "),
        },
      },
      { status: 400 },
    );
  }
  // Unexpected errors: log server-side, return a generic message to the client.
  console.error("[projectscope] unhandled route error:", error);
  return Response.json(
    { error: { code: "unknown", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

/** Parse and validate a JSON request body. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("validation_error", "The request body must be valid JSON.");
  }
  return schema.parse(raw);
}

/** Parse and validate a URL query string. */
export function parseQuery<T>(url: string, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  return schema.parse(params);
}
