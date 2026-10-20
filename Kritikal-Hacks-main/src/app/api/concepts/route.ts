import { z } from "zod";

import { jsonError, parseJsonBody, parseQuery } from "@/lib/api";

import { readConcepts, runConcepts } from "@/lib/research/analysis";
import { conceptRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ jobId: z.string().min(1) });

/** POST /api/concepts — run the Idea Studio. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, conceptRequestSchema);
    const result = await runConcepts(body.jobId, body.constraints, body.count);
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

/** GET /api/concepts?jobId=… — read the stored concepts. */
export async function GET(request: Request) {
  try {
    const { jobId } = parseQuery(request.url, querySchema);
    const concepts = await readConcepts(jobId);
    return Response.json({ concepts });
  } catch (error) {
    return jsonError(error);
  }
}
