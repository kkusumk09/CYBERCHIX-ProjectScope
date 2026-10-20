import type { Metadata } from "next";
import Link from "next/link";

import { BookmarkButton } from "@/components/toggle-buttons";
import { Tag, Card, CardBody, CardHeader, EmptyState, Stat } from "@/components/ui";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Saved research",
};

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const [jobs, savedProjects, savedReports] = await Promise.all([
    prisma.researchJob.findMany({
      orderBy: [{ isBookmarked: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        topic: true,
        status: true,
        stage: true,
        isDemo: true,
        resultCount: true,
        isBookmarked: true,
        createdAt: true,
        sources: true,
      },
    }),
    prisma.savedProject.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { project: true },
    }),
    prisma.savedReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { job: { select: { id: true, topic: true } } },
    }),
  ]);

  const bookmarked = jobs.filter((job) => job.isBookmarked);
  const totalRecords = jobs.reduce((sum, job) => sum + job.resultCount, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Saved research
        </h1>
        <p className="mt-2 max-w-3xl text-ink/70">
          Every research run you have started, plus the projects and reports you bookmarked.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Research runs" value={jobs.length} />
        <Stat label="Bookmarked runs" value={bookmarked.length} tone="sky" />
        <Stat label="Records collected" value={totalRecords} />
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader
            title="Research runs"
            description="Revisit a run, or bookmark it so stays at the top of this list."
          />
          <CardBody className="p-0">
            {jobs.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  title="No research runs yet"
                  description="Run your first search and it will appear here."
                  action={
                    <Link
                      href="/research"
                      className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-ink hover:bg-ink-soft"
                    >
                      Start a research run
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-[3px]-y divide-ink">
                {jobs.map((job) => (
                  <li key={job.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/research/${job.id}`}
                        className="text-sm font-semibold text-ink hover:text-punch"
                      >
                        {job.topic}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                        <Tag
                          tone={
                            job.status === "completed"
                              ? "mint"
                              : job.status === "failed"
                                ? "punch"
                                : job.status === "running"
                                  ? "sky"
                                  : "paper"
                          }
                        >
                          {job.status}
                        </Tag>
                        {job.isDemo ? <Tag tone="acid">demo</Tag> : null}
                        <span>{job.resultCount} records</span>
                        <span>·</span>
                        <span>{formatDate(job.createdAt)}</span>
                        <span>·</span>
                        <span>
                          {parseJson<string[]>(job.sources, []).length} source(s) selected
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/report?jobId=${job.id}`}
                        className="rounded-lg border-[3px] border-ink bg-paper-2 px-2.5 py-1.5 text-xs font-semibold text-ink/80 hover:bg-paper"
                      >
                        Report
                      </Link>
                      <Link
                        href={`/projects?jobId=${job.id}`}
                        className="rounded-lg border-[3px] border-ink bg-paper-2 px-2.5 py-1.5 text-xs font-semibold text-ink/80 hover:bg-paper"
                      >
                        Projects
                      </Link>
                      <BookmarkButton jobId={job.id} initialSaved={job.isBookmarked} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Saved projects" description="Records you bookmarked from the explorer." />
          <CardBody className="p-0">
            {savedProjects.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  title="No saved projects"
                  description="Open a project in the explorer and save ones worth coming back to."
                  action={
                    <Link
                      href="/projects"
                      className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-ink hover:bg-ink-soft"
                    >
                      Open the explorer
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-[3px]-y divide-ink">
                {savedProjects.map((saved) => (
                  <li key={saved.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/projects/${saved.projectId}`}
                        className="text-sm font-semibold text-ink hover:text-punch"
                      >
                        {saved.project.title}
                      </Link>
                      <Tag tone="paper">{saved.project.platform}</Tag>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/60">
                      {saved.project.summary}
                    </p>
                    {saved.note ? (
                      <p className="mt-1 text-xs text-ink/60">Note: {saved.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Exported reports" description="Reports you have exported." />
          <CardBody className="p-0">
            {savedReports.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  title="No exported reports"
                  description="Export a report from the market-gap page and it will be listed here."
                />
              </div>
            ) : (
              <ul className="divide-[3px]-y divide-ink">
                {savedReports.map((report) => (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {report.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/60">
                        {report.format} · {formatDate(report.createdAt)}
                      </p>
                    </div>
                    <Link
                      href={`/report?jobId=${report.jobId}`}
                      className="rounded-lg border-[3px] border-ink bg-paper-2 px-2.5 py-1.5 text-xs font-semibold text-ink/80 hover:bg-paper"
                    >
                      Open run
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
