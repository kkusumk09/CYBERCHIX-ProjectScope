import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/research/[jobId]/bookmark — save or unsave a research run.
 *
 * Send `{ saved: false }` to remove it from the saved list.
 */
export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await prisma.researchJob.findUnique({
      where: { id: jobId },
      select: { id: true, isBookmarked: true },
    });
    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    let saved = true;
    try {
      const body = (await request.json()) as { saved?: boolean };
      if (typeof body.saved === "boolean") saved = body.saved;
    } catch {
      // An empty body means "toggle" -> save.
    }

    await prisma.researchJob.update({
      where: { id: jobId },
      data: { isBookmarked: saved },
    });

    return Response.json({ jobId, saved });
  } catch (error) {
    return jsonError(error);
  }
}
