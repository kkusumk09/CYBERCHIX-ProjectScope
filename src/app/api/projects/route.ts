import { jsonError } from "@/lib/api";
import { queryProjects, type ProjectFilters } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects — the project explorer.
 *
 * Filters are only offered for metadata we actually collect. A filter value
 * that does not exist in the data is simply not shown in the UI, and an
 * unknown filter value returns an empty set rather than a fabricated one.
 *
 * The query itself lives in `src/lib/projects.ts` and is shared with the
 * explorer page, so the API and the page can never disagree about what a
 * filter means.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const award = url.searchParams.get("award")?.trim();
    const minRelevance = Number(url.searchParams.get("minRelevance") ?? "0");
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "24");

    const filters: ProjectFilters = {
      q: url.searchParams.get("q")?.trim() ?? undefined,
      platform: url.searchParams.get("platform")?.trim() || undefined,
      technology: url.searchParams.get("technology")?.trim() || undefined,
      domain: url.searchParams.get("domain")?.trim() || undefined,
      jobId: url.searchParams.get("jobId")?.trim() || undefined,
      award:
        award === "verified" || award === "unverified" || award === "none" ? award : undefined,
      minRelevance: Number.isFinite(minRelevance) && minRelevance > 0 ? minRelevance : undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 24,
    };

    const result = await queryProjects(filters);

    return Response.json({
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pages: result.pages,
      projects: result.projects,
      facets: result.facets,
    });
  } catch (error) {
    return jsonError(error);
  }
}
