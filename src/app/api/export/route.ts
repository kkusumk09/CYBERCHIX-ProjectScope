import { jsonError, parseJsonBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { buildJsonExport, buildMarkdownReport } from "@/lib/research/export";
import { exportRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/export — export a research report.
 *
 * `format: "markdown"` downloads a .md file; `format: "json"` returns the
 * structured export. The saved report is recorded so it appears under
 * "Saved research".
 */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, exportRequestSchema);

    const job = await prisma.researchJob.findUnique({
      where: { id: body.jobId },
      select: { id: true, topic: true },
    });
    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    const slug = job.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    if (body.format === "json") {
      const payload = await buildJsonExport(body.jobId);
      await prisma.savedReport.create({
        data: { jobId: body.jobId, title: `${job.topic} (JSON export)`, format: "json" },
      });
      return Response.json(payload, {
        headers: {
          "Content-Disposition": `attachment; filename="projectscope-${slug || "report"}.json"`,
        },
      });
    }

    const markdown = await buildMarkdownReport(body.jobId);
    await prisma.savedReport.create({
      data: { jobId: body.jobId, title: `${job.topic} (report)`, format: "markdown" },
    });

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="projectscope-${slug || "report"}.md"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
