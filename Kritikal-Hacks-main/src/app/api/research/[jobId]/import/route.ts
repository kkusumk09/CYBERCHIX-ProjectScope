import { prisma } from "@/lib/db";
import { jsonError, parseJsonBody } from "@/lib/api";
import { stringifyJson } from "@/lib/json";
import { manualImportSchema, SOURCE_REGISTRY } from "@/lib/schema";
import { platformForUrl } from "@/lib/research/sources";
import { emitEvent } from "@/lib/research/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/research/[jobId]/import — add records the user supplied.
 *
 * This is the permitted alternative to retrieving a source automatically:
 * the user pastes data or imports a file they are entitled to use. The
 * records are marked `manual-import` and keep the user's attribution.
 */
export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    const body = await parseJsonBody(request, manualImportSchema);

    const job = await prisma.researchJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    const source = SOURCE_REGISTRY[body.sourceId];
    const created: string[] = [];

    for (const entry of body.entries) {
      const attribution =
        entry.attribution ||
        `${source.name} — "${entry.title}" (added manually by the user)`;

      const project = await prisma.project.create({
        data: {
          title: entry.title,
          platform: entry.platform || platformForUrl(entry.url) || source.name,
          sourceId: body.sourceId,
          sourceUrl: entry.url,
          attribution,
          summary: entry.summary,
          problemAddressed: entry.problemAddressed,
          proposedSolution: entry.proposedSolution,
          targetUsers: entry.targetUsers,
          technologies: stringifyJson(entry.technologies),
          award: entry.award || null,
          awardVerified: false,
          uncertaintyNotes: stringifyJson([
            "Manually imported record — the fields reflect what the user supplied and were not verified by ProjectScope.",
          ]),
          discoveryMetadata: stringifyJson([
            {
              sourceId: body.sourceId,
              sourceName: source.name,
              accessMode: "manual-import",
              retrievedAt: new Date().toISOString(),
            },
          ]),
          retrievedAt: new Date(),
        },
      });

      const existing = await prisma.researchResult.findUnique({
        where: { jobId_projectId: { jobId, projectId: project.id } },
      });

      if (!existing) {
        await prisma.researchResult.create({
          data: {
            jobId,
            projectId: project.id,
            relevance: 0.5,
            rank: 0,
            discoveryNote: "manual-import",
          },
        });
      }

      await prisma.sourceReference.create({
        data: {
          jobId,
          sourceId: body.sourceId,
          sourceName: source.name,
          url: entry.url,
          title: entry.title,
          attribution,
          accessMode: "manual-import",
          snippet: entry.summary,
          retrievedAt: new Date(),
        },
      });

      created.push(project.id);
    }

    const total = await prisma.researchResult.count({ where: { jobId } });
    await prisma.researchJob.update({
      where: { id: jobId },
      data: { resultCount: total },
    });

    await emitEvent(jobId, {
      type: "import.done",
      stage: "storing",
      level: "success",
      message: `Added ${created.length} manually imported record(s) from ${source.name}.`,
      payload: { count: created.length, sourceId: body.sourceId },
    });

    return Response.json({ imported: created.length, projectIds: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
