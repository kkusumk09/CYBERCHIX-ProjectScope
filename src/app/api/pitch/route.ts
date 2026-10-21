import { z } from "zod";

import { jsonError, parseJsonBody, parseQuery } from "@/lib/api";

import { readPitch, runPitch, savePitch } from "@/lib/research/analysis";
import { pitchRequestSchema, pitchUpdateSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** The pitch is produced by a live model call with a 45s timeout. */
export const maxDuration = 300;

const querySchema = z.object({ jobId: z.string().min(1) });

/** POST /api/pitch — build or refresh the pitch. */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, pitchRequestSchema);
    const content = await runPitch(body.jobId, body.conceptId, body.extra, body.notes);
    const stored = await readPitch(body.jobId);
    return Response.json({ pitch: stored, content });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * PUT /api/pitch — save a pitch the user edited by hand.
 *
 * The Pitch Studio presents every field as editable, so the edited text has to
 * be persisted; otherwise the export would still contain the generated text.
 */
export async function PUT(request: Request) {
  try {
    const body = await parseJsonBody(request, pitchUpdateSchema);
    const pitch = await savePitch(body.jobId, body.content);
    return Response.json({ pitch });
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
