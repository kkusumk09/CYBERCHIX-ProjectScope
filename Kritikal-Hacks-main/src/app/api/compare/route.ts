import { jsonError, parseJsonBody } from "@/lib/api";

import { runComparison } from "@/lib/research/analysis";
import { compareRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/compare — compare the approaches behind a set of projects. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, compareRequestSchema);
    const comparison = await runComparison(body.jobId, body.projectIds);
    return Response.json({ comparison });
  } catch (error) {
    return jsonError(error);
  }
}
