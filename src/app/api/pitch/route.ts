import { z } from "zod";

import { jsonError, parseJsonBody, parseQuery } from "@/lib/api";

import { readPitch, runPitch } from "@/lib/research/analysis";
import { pitchRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ jobId: z.string().min(1) });

/** POST /api/pitch — build or refresh the pitch. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, pitchRequestSchema);
    const content = await runPitch(body.jobId, body.conceptId, body.extra);
    const stored = await readPitch(body.jobId);
    return Response.json({ pitch: stored, content });
  } catch (error) {
    return jsonError(error);
  }
}

/** GET /api/pitch?jobId=… — read the stored pitch. */
export async function GET(request: Request) {
  try {
    const { jobId } = parseQuery(request.url, querySchema);
    const pitch = await readPitch(jobId);
    if (!pitch) {
      return Response.json(
        { error: { code: "not_found", message: "No pitch has been generated for that job yet." } },
        { status: 404 },
      );
    }
    return Response.json({ pitch });
  } catch (error) {
    return jsonError(error);
  }
}
