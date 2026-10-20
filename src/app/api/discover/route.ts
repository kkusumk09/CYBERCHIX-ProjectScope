import { prisma } from "@/lib/db";
import { jsonError, parseJsonBody, parseQuery } from "@/lib/api";
import { getEnv, getProviderStatus, isDemoMode } from "@/lib/env";
import { parseJson, stringifyJson } from "@/lib/json";
import { discoveryRequestSchema, sourceCheckSchema } from "@/lib/schema";
import { runDiscovery } from "@/lib/research/discovery";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/discover — start a free-choice discovery run.
 *
 * The user does not have to name a problem. ProjectScope researches
 * permitted sources on its own, identifies promising problems, designs and
 * ranks five concepts, and recommends one.
 */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, discoveryRequestSchema);
    const env = getEnv();
    const demo = isDemoMode();

    const resultLimit = Math.min(body.resultLimit, env.MAX_RESULTS_LIMIT);

    const job = await prisma.researchJob.create({
      data: {
        // There is no user topic in free-choice mode, so the job is titled
        // after what the run is for.
        topic: "Free-choice discovery — finding a problem worth solving",
        resultLimit,
        sources: stringifyJson(body.sources),
        status: "queued",
        stage: "queued",
        isDemo: demo,
      },
    });

    const discovery = await prisma.ideaDiscovery.create({
      data: {
        jobId: job.id,
        interests: body.interests,
        techPreferences: body.techPreferences,
        teamCapabilities: body.teamCapabilities,
        constraints: body.constraints,
        status: "queued",
        stage: "queued",
        isDemo: demo,
      },
    });

    void runDiscovery({
      discoveryId: discovery.id,
      jobId: job.id,
      interests: body.interests,
      techPreferences: body.techPreferences,
      teamCapabilities: body.teamCapabilities,
      constraints: body.constraints,
      sources: body.sources,
      resultLimit,
      conceptCount: body.conceptCount,
      language: body.language,
      location: body.location,
      isDemo: demo,
    });

    return Response.json(
      {
        discovery: {
          id: discovery.id,
          jobId: job.id,
          status: discovery.status,
          stage: discovery.stage,
          isDemo: discovery.isDemo,
        },
        demoMode: demo,
      },
      { status: 202 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

const querySchema = z.object({ discoveryId: z.string().min(1) });

/** GET /api/discover?discoveryId=… — read the results of a discovery run. */
export async function GET(request: Request) {
  try {
    const { discoveryId } = parseQuery(request.url, querySchema);

    const discovery = await prisma.ideaDiscovery.findUnique({
      where: { id: discoveryId },
      include: { job: true, proposals: { orderBy: { createdAt: "desc" } } },
    });

    if (!discovery) {
      return Response.json(
        { error: { code: "not_found", message: "That discovery run does not exist." } },
        { status: 404 },
      );
    }

    return Response.json({
      discovery: {
        id: discovery.id,
        jobId: discovery.jobId,
        interests: discovery.interests,
        techPreferences: discovery.techPreferences,
        teamCapabilities: discovery.teamCapabilities,
        constraints: discovery.constraints,
        status: discovery.status,
        stage: discovery.stage,
        isDemo: discovery.isDemo,
        errorMessage: discovery.errorMessage,
        concepts: parseJson(discovery.concepts, []),
        recommendation: parseJson(discovery.recommendation, null),
        analysis: parseJson(discovery.analysis, {}),
        sourcesChecked: parseJson(discovery.job.sourcesChecked, [], sourceCheckSchema.array()),
        resultCount: discovery.job.resultCount,
        createdAt: discovery.createdAt.toISOString(),
        proposals: discovery.proposals.map((proposal) => ({
          id: proposal.id,
          conceptId: proposal.conceptId,
          title: proposal.title,
          isDemo: proposal.isDemo,
          createdAt: proposal.createdAt.toISOString(),
        })),
      },
      demoMode: isDemoMode(),
      providers: getProviderStatus(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
