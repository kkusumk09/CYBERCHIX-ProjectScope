import { getProviderStatus, isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — which providers are configured, and whether the
 * database actually answers.
 *
 * This never returns a key, only whether one is present and which model id
 * would be used. The database check matters on a serverless deployment,
 * where a misconfigured `DATABASE_URL` is the most common failure and the
 * rest of the application simply cannot work.
 */
export async function GET() {
  const providers = getProviderStatus();

  let database: { ok: boolean; kind: string; error?: string } = {
    ok: false,
    kind: "unknown",
  };

  try {
    const url = process.env.DATABASE_URL ?? "file:./dev.db";
    database = {
      ok: true,
      kind: url.startsWith("libsql:") ? "libsql" : url.startsWith("file:") ? "sqlite-file" : "other",
    };
    // Prove the connection works rather than assuming it.
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = {
      ...database,
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 300) : "Unknown database error",
    };
  }

  return Response.json({
    ok: database.ok,
    demoMode: isDemoMode(),
    database,
    providers: providers.map((provider) => ({
      name: provider.name,
      configured: provider.configured,
      model: provider.model ?? null,
    })),
    checkedAt: new Date().toISOString(),
  });
}
