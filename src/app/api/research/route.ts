import { prisma } from "@/lib/db";
import { jsonError, parseJsonBody } from "@/lib/api";
import { getEnv, getProviderStatus, isDemoMode } from "@/lib/env";
import { stringifyJson } from "@/lib/json";
import { researchRequestSchema } from "@/lib/schema";
import { runResearch } from "@/lib/research/pipeline";
import { runAfterResponse } from "@/lib/background";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * A research run calls several providers with a 45s timeout each, so the
 * invocation needs more than the default function budget. On Vercel this also
 * bounds how long the `after()` callback may keep running.
 */
export const maxDuration = 300;

/**
 * POST /api/research — start a research run.
 *
 * The job is created synchronously (so the client always gets an id) and the
 * pipeline runs in the background. Progress is streamed from
 * GET /api/research/[jobId]/events.
 */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, researchRequestSchema);
    const env = getEnv();

    const limit = Math.min(body.resultLimit, env.MAX_RESULTS_LIMIT);

    const job = await prisma.researchJob.create({
      data: {
        topic: body.topic,
        problemStatement: body.problemStatement || null,
        domain: body.domain || null,
        targetUsers: body.targetUsers || null,
        geography: body.geography || null,
        resultLimit: limit,
        sources: stringifyJson(body.sources),
        status: "queued",
        stage: "queued",
        isDemo: isDemoMode(),
      },
    });

    /*
     * `after` keeps the invocation alive until the pipeline settles. Without
     * it a serverless platform freezes the function as soon as the response
     * is sent, and the run would never finish. The pipeline records its own
     * progress and failures.
     */
    runAfterResponse(async () => {
      await runResearch({
        jobId: job.id,
        topic: job.topic,
        problemStatement: job.problemStatement ?? "",
        domain: job.domain ?? "",
        targetUsers: job.targetUsers ?? "",
        geography: job.geography ?? "",
        sources: body.sources,
        resultLimit: limit,
        language: body.language,
        location: body.location,
        isDemo: isDemoMode(),
      });
    });

    return Response.json(
      {
        job: {
          id: job.id,
          topic: job.topic,
          status: job.status,
          stage: job.stage,
          isDemo: job.isDemo,
          createdAt: job.createdAt.toISOString(),
        },
        demoMode: isDemoMode(),
      },
      { status: 202 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

/** GET /api/research — list the research runs (used by Saved research). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bookmarkedOnly = url.searchParams.get("bookmarked") === "true";

    const jobs = await prisma.researchJob.findMany({
      where: bookmarkedOnly ? { isBookmarked: true } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        topic: true,
        problemStatement: true,
        domain: true,
        targetUsers: true,
        geography: true,
        status: true,
        stage: true,
        isDemo: true,
        resultCount: true,
        isBookmarked: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return Response.json({
      jobs: jobs.map((job) => ({ ...job, createdAt: job.createdAt.toISOString() })),
      demoMode: isDemoMode(),
      providers: getProviderStatus(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
