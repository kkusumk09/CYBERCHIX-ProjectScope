import "server-only";

/**
 * Project queries shared by the explorer page and the API.
 *
 * Filters only exist for metadata we actually collect. If a facet has no
 * values in the database, it is not offered — it is never invented.
 */
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";

export interface ProjectFilters {
  q?: string;
  platform?: string;
  technology?: string;
  domain?: string;
  award?: "verified" | "unverified" | "none";
  jobId?: string;
  minRelevance?: number;
  page?: number;
  pageSize?: number;
}

export interface ProjectRow {
  id: string;
  title: string;
  platform: string;
  summary: string;
  problemAddressed: string | null;
  proposedSolution: string | null;
  targetUsers: string | null;
  technologies: string[];
  businessModel: string | null;
  distribution: string | null;
  award: string | null;
  awardVerified: boolean;
  ranking: string | null;
  domain: string | null;
  clusterId: string | null;
  uncertaintyNotes: string[];
  sourceUrl: string;
  attribution: string;
  retrievedAt: string;
  relevance: number;
  jobId: string;
  isSaved: boolean;
}

export interface ProjectFacets {
  platforms: Array<{ value: string; count: number }>;
  technologies: Array<{ value: string; count: number }>;
  domains: Array<{ value: string; count: number }>;
  awards: { verified: number; unverified: number };
}

export async function queryProjects(filters: ProjectFilters): Promise<{
  projects: ProjectRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  facets: ProjectFacets;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, filters.pageSize ?? 24));

  const where: Record<string, unknown> = {};
  if (filters.jobId) where.jobId = filters.jobId;
  if (filters.platform) where.project = { platform: filters.platform };
  if (filters.domain) {
    where.project = { ...((where.project as object) ?? {}), domain: filters.domain };
  }

  const rows = await prisma.researchResult.findMany({
    where,
    include: { project: { include: { savedBy: true } } },
    orderBy: [{ relevance: "desc" }, { rank: "asc" }],
  });

  let results = rows;

  const keyword = (filters.q ?? "").trim().toLowerCase();
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

  if (filters.technology) {
    const wanted = filters.technology.toLowerCase();
    results = results.filter(({ project }) =>
      parseJson<string[]>(project.technologies, []).some(
        (item) => item.toLowerCase() === wanted,
      ),
    );
  }

  if (filters.award === "verified") {
    results = results.filter(({ project }) => project.awardVerified);
  } else if (filters.award === "unverified") {
    results = results.filter(({ project }) => !project.awardVerified);
  } else if (filters.award === "none") {
    results = results.filter(({ project }) => !project.award);
  }

  if (typeof filters.minRelevance === "number" && filters.minRelevance > 0) {
    const minimum = filters.minRelevance;
    results = results.filter((result) => result.relevance >= minimum);
  }

  const total = results.length;
  const start = (page - 1) * pageSize;
  const pageRows = results.slice(start, start + pageSize);

  const facetRows = await prisma.project.findMany({
    select: { platform: true, technologies: true, domain: true, award: true, awardVerified: true },
  });

  const platforms = new Map<string, number>();
  const technologies = new Map<string, number>();
  const domains = new Map<string, number>();
  let verifiedAwards = 0;
  let unverifiedAwards = 0;

  for (const project of facetRows) {
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

  const projects: ProjectRow[] = pageRows.map((result) => ({
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
    jobId: result.jobId,
    isSaved: result.project.savedBy.length > 0,
  }));

  return {
    projects,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      platforms: toOptions(platforms),
      technologies: toOptions(technologies),
      domains: toOptions(domains),
      awards: { verified: verifiedAwards, unverified: unverifiedAwards },
    },
  };
}
