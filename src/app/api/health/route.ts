import { getProviderStatus, isDemoMode } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — which providers are configured.
 *
 * This never returns a key, only whether one is present and which model id
 * would be used.
 */
export async function GET() {
  const providers = getProviderStatus();
  return Response.json({
    ok: true,
    demoMode: isDemoMode(),
    providers: providers.map((provider) => ({
      name: provider.name,
      configured: provider.configured,
      model: provider.model ?? null,
    })),
    checkedAt: new Date().toISOString(),
  });
}
