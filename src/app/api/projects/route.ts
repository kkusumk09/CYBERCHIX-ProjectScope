import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { parseJson } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects — the project explorer.
 *
 * Filters are only offered for metadata we actually collect. A filter value
 * that does not exist in the data is simply not shown in the UI, and an
 * unknown filter value returns an empty set rather than a fabricated one.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const keyword = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const platform = url.searchParams.get("platform")?.trim() ?? "";
    const technology = url.searchParams.get("technology")?.trim() ?? "";
    const domain = url.searchParams.get("domain")?.trim() ?? "";
    const awardStatus = url.searchParams.get("award")?.trim() ?? "";
    const jobId = url.searchParams.get("jobId")?.trim() ?? "";
    const minRelevance = Number(url.searchParams.get("minRelevance") ?? "0");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "24")));

    const where: Record<string, unknown> = {};
    if (jobId) where.jobId = jobId;
    if (platform) where.project = { platform };
    if (domain) where.project = { ...(where.project as object), domain };

    const rows = await prisma.researchResult.findMany({
      where,
      include: { project: true },
      orderBy: [{ relevance: "desc" }, { rank: "asc" }],
    });

    let results = rows;

    if (keyword) {
      results = results.filter(({ project }) =>
        [
          project.title,
          project.summary,
          project.problemAddressed ?? "",
          project.proposedSolution ?? "",
          project.targetUsers ?? "",
          project.technologies,
          project.domain ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      );
    }

    if (technology) {
      results = results.filter(({ project }) =>
        parseJson<string[]>(project.technologies, []).some(
          (item) => item.toLowerCase() === technology.toLowerCase(),
        ),
      );
    }

    if (awardStatus === "verified") {
      results = results.filter(({ project }) => project.awardVerified);
    } else if (awardStatus === "unverified") {
      results = results.filter(({ project }) => !project.awardVerified);
    } else if (awardStatus === "none") {
      results = results.filter(({ project }) => !project.award);
    }

    if (Number.isFinite(minRelevance) && minRelevance > 0) {
      results = results.filter((result) => result.relevance >= minRelevance);
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const pageRows = results.slice(start, start + pageSize);

    // Facets are computed from the data that actually exists.
    const facetProjects = await prisma.project.findMany({
      select: { platform: true, technologies: true, domain: true, award: true, awardVerified: true },
    });

    const platforms = new Map<string, number>();
    const technologies = new Map<string, number>();
    const domains = new Map<string, number>();
    let verifiedAwards = 0;
    let unverifiedAwards = 0;

    for (const project of facetProjects) {
      platforms.set(project.platform, (platforms.get(project.platform) ?? 0) + 1);
      if (project.domain) domains.set(project.domain, (domains.get(project.domain) ?? 0) + 1);
      for (const technology of parseJson<string[]>(project.technologies, [])) {
        technologies.set(technology, (technologies.get(technology) ?? 0) + 1);
      }
      if (project.award) {
        if (project.awardVerified) verifiedAwards += 1;
        else unverifiedAwards += 1;
      }
    }

    const toOptions = (map: Map<string, number>) =>
      [...map.entries()]
        .filter(([value]) => value.trim().length > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, count }));

    return Response.json({
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      projects: pageRows.map((result) => ({
        id: result.project.id,
        title: result.project.title,
        platform: result.project.platform,
        summary: result.project.summary,
        problemAddressed: result.project.problemAddressed,
        proposedSolution: result.project.proposedSolution,
        targetUsers: result.project.targetUsers,
        technologies: parseJson<string[]>(result.project.technologies, []),
        businessModel: result.project.businessModel,
        distribution: result.project.distribution,
        award: result.project.award,
        awardVerified: result.project.awardVerified,
        ranking: result.project.ranking,
        domain: result.project.domain,
        clusterId: result.project.clusterId,
        uncertaintyNotes: parseJson<string[]>(result.project.uncertaintyNotes, []),
        sourceUrl: result.project.sourceUrl,
        attribution: result.project.attribution,
        retrievedAt: result.project.retrievedAt.toISOString(),
        relevance: result.relevance,
        rank: result.rank,
        jobId: result.jobId,
        isDemo: result.isDemo,
      })),
      facets: {
        platforms: toOptions(platforms),
        technologies: toOptions(technologies),
        domains: toOptions(domains),
        awards: {
          verified: verifiedAwards,
          unverified: unverifiedAwards,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
