import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { parseJson } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects/[id] — one project with its full source attribution. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        results: {
          include: { job: { select: { id: true, topic: true, createdAt: true } } },
        },
        savedBy: true,
      },
    });

    if (!project) {
      return Response.json(
        { error: { code: "not_found", message: "That project does not exist." } },
        { status: 404 },
      );
    }

    const sources = await prisma.sourceReference.findMany({
      where: { jobId: { in: project.results.map((result) => result.jobId) } },
      orderBy: { retrievedAt: "desc" },
    });

    return Response.json({
      project: {
        id: project.id,
        title: project.title,
        platform: project.platform,
        summary: project.summary,
        problemAddressed: project.problemAddressed,
        proposedSolution: project.proposedSolution,
        targetUsers: project.targetUsers,
        technologies: parseJson<string[]>(project.technologies, []),
        businessModel: project.businessModel,
        distribution: project.distribution,
        award: project.award,
        awardVerified: project.awardVerified,
        ranking: project.ranking,
        domain: project.domain,
        clusterId: project.clusterId,
        uncertaintyNotes: parseJson<string[]>(project.uncertaintyNotes, []),
        discoveryMetadata: parseJson(project.discoveryMetadata, []),
        sourceUrl: project.sourceUrl,
        sourceId: project.sourceId,
        attribution: project.attribution,
        retrievedAt: project.retrievedAt.toISOString(),
        isSaved: project.savedBy.length > 0,
        savedNote: project.savedBy[0]?.note ?? null,
        relevance: project.results[0]?.relevance ?? 0,
        jobs: project.results.map((result) => ({
          id: result.job.id,
          topic: result.job.topic,
          createdAt: result.job.createdAt.toISOString(),
        })),
        sources: sources.map((source) => ({
          id: source.id,
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          url: source.url,
          title: source.title,
          attribution: source.attribution,
          accessMode: source.accessMode,
          snippet: source.snippet,
          retrievedAt: source.retrievedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
