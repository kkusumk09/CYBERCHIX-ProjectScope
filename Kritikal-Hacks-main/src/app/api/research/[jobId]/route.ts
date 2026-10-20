import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { parseJson } from "@/lib/json";
import { sourceCheckSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/research/[jobId] — the current state of a research run. */
export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await prisma.researchJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        topic: true,
        problemStatement: true,
        domain: true,
        targetUsers: true,
        geography: true,
        resultLimit: true,
        sources: true,
        status: true,
        stage: true,
        isDemo: true,
        errorMessage: true,
        resultCount: true,
        sourcesChecked: true,
        isBookmarked: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    });

    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    return Response.json({
      job: {
        ...job,
        sources: parseJson<string[]>(job.sources, []),
        sourcesChecked: parseJson(job.sourcesChecked, [], sourceCheckSchema.array()),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
