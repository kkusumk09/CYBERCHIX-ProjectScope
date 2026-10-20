import { prisma } from "@/lib/db";
import { jsonError, parseJsonBody } from "@/lib/api";
import { saveProjectSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/projects/save — bookmark or un-bookmark a project.
 *
 * Send `{ projectId, note }` to save, or `{ projectId, note, unsave: true }`
 * to remove it again.
 */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, saveProjectSchema);
    const unsave =
      body.saved === false || request.headers.get("x-unsave") === "true";

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    });
    if (!project) {
      return Response.json(
        { error: { code: "not_found", message: "That project does not exist." } },
        { status: 404 },
      );
    }

    if (unsave) {
      await prisma.savedProject.deleteMany({ where: { projectId: body.projectId } });
      return Response.json({ saved: false, projectId: body.projectId });
    }

    await prisma.savedProject.upsert({
      where: { projectId: body.projectId },
      create: { projectId: body.projectId, note: body.note || null },
      update: { note: body.note || null },
    });

    return Response.json({ saved: true, projectId: body.projectId });
  } catch (error) {
    return jsonError(error);
  }
}
