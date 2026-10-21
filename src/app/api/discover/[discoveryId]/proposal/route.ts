import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { proposalRequestSchema, type SourceId } from "@/lib/schema";
import { buildProposalForConcept, runDiscovery } from "@/lib/research/discovery";
import { runAfterResponse } from "@/lib/background";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Regenerating re-runs the whole discovery pipeline. */
export const maxDuration = 300;

/**
 * POST /api/discover/[discoveryId]/proposal
 *
 * Body: `{ conceptId, userNotes }` to build a proposal, or
 * `{ action: "regenerate" }` to design a fresh set of concepts from the
 * same evidence.
 */
export async function POST(request: Request, context: { params: Promise<{ discoveryId: string }> }) {
  try {
    const { discoveryId } = await context.params;

    const discovery = await prisma.ideaDiscovery.findUnique({
      where: { id: discoveryId },
      include: { job: { select: { sources: true, resultLimit: true } } },
    });

    if (!discovery) {
      return Response.json(
        { error: { code: "not_found", message: "That discovery run does not exist." } },
        { status: 404 },
      );
    }

    // The body is read exactly once — reading it twice would consume it.
    const body = await request.json().catch(() => ({}));
    const raw = body as {
      action?: string;
      conceptId?: string;
      userNotes?: string;
    };

    // --- Regenerate: design a fresh set of concepts from the same evidence --
    if (raw.action === "regenerate") {
      const sources = JSON.parse(discovery.job.sources ?? "[]") as SourceId[];

      await prisma.ideaDiscovery.update({
        where: { id: discoveryId },
        data: { status: "queued", stage: "queued", errorMessage: null },
      });

      // `after` keeps the serverless invocation alive until the run finishes.
      runAfterResponse(async () => {
        await runDiscovery({
          discoveryId,
          jobId: discovery.jobId,
          interests: discovery.interests,
          techPreferences: discovery.techPreferences,
          teamCapabilities: discovery.teamCapabilities,
          constraints: discovery.constraints,
          sources,
          resultLimit: discovery.job.resultLimit,
          // Reuse the count the user originally chose — regenerating must not
          // silently change how many concepts are designed.
          conceptCount: discovery.conceptCount,
          language: "en",
          location: "US",
          isDemo: discovery.isDemo,
        });
      });

      return Response.json({ discoveryId, status: "queued" }, { status: 202 });
    }

    // --- Proposal -----------------------------------------------------------
    const parsed = proposalRequestSchema.parse({
      conceptId: raw.conceptId ?? "",
      userNotes: raw.userNotes ?? "",
    });

    const proposal = await buildProposalForConcept(
      discoveryId,
      parsed.conceptId,
      parsed.userNotes,
    );

    return Response.json(
      {
        proposal: {
          id: proposal.id,
          title: proposal.title,
          content: proposal.content,
          isDemo: proposal.isDemo,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
