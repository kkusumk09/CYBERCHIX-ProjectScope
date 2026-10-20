import type { Metadata } from "next";
import Link from "next/link";

import { ProjectCard } from "@/components/project-card";
import { Tag, Card, CardBody, EmptyState, Input, Stat } from "@/components/ui";
import { prisma } from "@/lib/db";
import { queryProjects, type ProjectFacets } from "@/lib/projects";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Project explorer",
};

export const dynamic = "force-dynamic";

function buildHref(
  base: URLSearchParams,
  changes: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams(base);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  params.delete("page");
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}

function FacetGroup({
  title,
  options,
  active,
  param,
  base,
}: {
  title: string;
  options: Array<{ value: string; count: number }>;
  active?: string;
  param: string;
  base: URLSearchParams;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
        {title}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isActive = active === option.value;
          return (
            <li key={option.value}>
              <Link
                href={buildHref(base, { [param]: isActive ? undefined : option.value })}
                className={
                  isActive
                    ? "inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-ink"
                    : "inline-flex items-center gap-1 rounded-full border-[3px] border-ink bg-paper-2 px-2.5 py-1 text-xs font-medium text-ink/70 hover:border-ink hover:text-punch"
                }
              >
                {option.value}
                <span className={isActive ? "text-brand-100" : "text-ink/50"}>{option.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const params = await searchParams;
  const base = new URLSearchParams();

  const pick = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  const filters = {
    q: pick("q"),
    platform: pick("platform"),
    technology: pick("technology"),
    domain: pick("domain"),
    award: pick("award") as "verified" | "unverified" | "none" | undefined,
    jobId: pick("jobId"),
    page: Number(pick("page") ?? "1") || 1,
  };

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string" && value) base.set(key, value);
  }
  if (filters.page > 1) base.set("page", String(filters.page));

  const result = await queryProjects(filters);
  const facets: ProjectFacets = result.facets;

  const jobs = await prisma.researchJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, topic: true, isDemo: true },
  });

  const awardOptions = [
    { value: "verified", count: facets.awards.verified },
    { value: "unverified", count: facets.awards.unverified },
    { value: "none", count: 0 },
  ].filter((option) => option.count > 0 || option.value === filters.award);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Project explorer
          </h1>
          <p className="mt-2 max-w-3xl text-ink/70">
            {result.total} record{result.total === 1 ? "" : "s"} found. Filters only appear for
            metadata that actually exists in the collected data.
          </p>
        </div>
        {filters.jobId ? (
          <Link
            href="/projects"
            className="text-sm font-medium text-punch hover:underline"
          >
            Show all runs
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Filters */}
        <aside className="space-y-5">
          <Card>
            <CardBody>
              <form method="get" action="/projects" className="space-y-3">
                {filters.jobId ? <input type="hidden" name="jobId" value={filters.jobId} /> : null}
                {filters.platform ? (
                  <input type="hidden" name="platform" value={filters.platform} />
                ) : null}
                {filters.technology ? (
                  <input type="hidden" name="technology" value={filters.technology} />
                ) : null}
                {filters.domain ? <input type="hidden" name="domain" value={filters.domain} /> : null}
                {filters.award ? <input type="hidden" name="award" value={filters.award} /> : null}
                <label htmlFor="q" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Keyword
                </label>
                <Input
                  id="q"
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Search titles and summaries"
                  className="text-sm"
                />
                <button
                  type="submit"
                  className="h-9 w-full rounded-lg bg-ink text-sm font-semibold text-ink transition-colors hover:bg-ink-soft"
                >
                  Search
                </button>
                {filters.q || filters.platform || filters.technology || filters.domain || filters.award ? (
                  <Link
                    href={buildHref(base, {
                      q: undefined,
                      platform: undefined,
                      technology: undefined,
                      domain: undefined,
                      award: undefined,
                    })}
                    className="block text-center text-xs font-medium text-ink/60 hover:text-punch"
                  >
                    Clear all filters
                  </Link>
                ) : null}
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-5">
              {jobs.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                    Research run
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {jobs.map((job) => {
                      const isActive = filters.jobId === job.id;
                      return (
                        <li key={job.id}>
                          <Link
                            href={buildHref(base, { jobId: isActive ? undefined : job.id })}
                            className={cn(
                              "block truncate rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-ink text-ink"
                                : "text-ink/70 hover:bg-ink-100 hover:text-punch",
                            )}
                            title={job.topic}
                          >
                            {job.topic}
                            {job.isDemo ? " (demo)" : ""}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <FacetGroup
                title="Platform"
                options={facets.platforms}
                active={filters.platform}
                param="platform"
                base={base}
              />

              <FacetGroup
                title="Domain"
                options={facets.domains}
                active={filters.domain}
                param="domain"
                base={base}
              />

              <FacetGroup
                title="Technology"
                options={facets.technologies.slice(0, 18)}
                active={filters.technology}
                param="technology"
                base={base}
              />

              {awardOptions.length > 0 ? (
                <FacetGroup
                  title="Award status"
                  options={awardOptions}
                  active={filters.award}
                  param="award"
                  base={base}
                />
              ) : null}
            </CardBody>
          </Card>
        </aside>

        {/* Results */}
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Records found" value={result.total} />
            <Stat label="Platforms" value={facets.platforms.length} />
            <Stat
              label="Verified awards"
              value={facets.awards.verified}
              tone={facets.awards.verified > 0 ? "mint" : "paper"}
              hint="Only awards the source stated explicitly"
            />
          </div>

          {result.projects.length === 0 ? (
            <EmptyState
              title="No records match those filters"
              description="Try removing a filter, or run new research job with broader query."
              action={
                <Link
                  href="/research"
                  className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-ink hover:bg-ink-soft"
                >
                  Start a new research run
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {result.projects.map((project) => (
                  <ProjectCard key={`${project.jobId}-${project.id}`} project={project} />
                ))}
              </div>

              {result.pages > 1 ? (
                <nav className="flex items-center justify-between pt-2 text-sm">
                  {result.page > 1 ? (
                    <Link
                      href={`/projects?${new URLSearchParams({ ...Object.fromEntries(base), page: String(result.page - 1) })}`}
                      className="rounded-lg border-[3px] border-ink bg-paper-2 px-3 py-1.5 font-medium shadow-sm hover:bg-paper"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-ink/60">
                    Page {result.page} of {result.pages}
                  </span>
                  {result.page < result.pages ? (
                    <Link
                      href={`/projects?${new URLSearchParams({ ...Object.fromEntries(base), page: String(result.page + 1) })}`}
                      className="rounded-lg border-[3px] border-ink bg-paper-2 px-3 py-1.5 font-medium shadow-sm hover:bg-paper"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </>
          )}

          {facets.platforms.length === 0 ? (
            <Card>
              <CardBody className="text-sm text-ink/60">
                <Tag tone="acid">Nothing collected yet</Tag>
                <p className="mt-2">
                  No project records exist yet. Run a research job to populate the explorer, or
                  import records you are entitled to use.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
