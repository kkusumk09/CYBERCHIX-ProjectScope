import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Tag, Card, CardBody, CardHeader, Stat } from "@/components/ui";
import { SaveProjectButton } from "@/components/toggle-buttons";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { formatDate, hostFromUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Project detail",
};

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      results: { include: { job: { select: { id: true, topic: true } } } },
      savedBy: true,
    },
  });

  if (!project) notFound();

  const jobIds = project.results.map((result) => result.jobId);
  const sources = await prisma.sourceReference.findMany({
    where: { jobId: { in: jobIds } },
    orderBy: { retrievedAt: "desc" },
  });

  const technologies = parseJson<string[]>(project.technologies, []);
  const uncertainty = parseJson<string[]>(project.uncertaintyNotes, []);
  const discovery = parseJson<
    Array<{ sourceId: string; sourceName: string; siteName: string; snippet: string; accessMode: string; retrievedAt: string }>
  >(project.discoveryMetadata, []);

  const field = (label: string, value: string | null | undefined) => (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">
        {value && value.trim() ? value : <span className="text-ink/50">Not stated in the source</span>}
      </dd>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-sm font-medium text-punch hover:underline"
        >
          ← Back to the explorer
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag tone="paper">{project.platform}</Tag>
            {project.domain ? <Tag tone="paper">{project.domain}</Tag> : null}
            {project.clusterId ? <Tag tone="sky">cluster: {project.clusterId}</Tag> : null}
            {project.savedBy.length > 0 ? <Tag tone="mint">saved</Tag> : null}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
            {project.title}
          </h1>
          <p className="mt-2 max-w-3xl text-ink/70">{project.summary}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-paper-2 shadow-sm hover:bg-ink-soft"
          >
            Open original source ↗
          </a>
          <SaveProjectButton
            projectId={project.id}
            initialSaved={project.savedBy.length > 0}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Relevance"
          value={`${Math.round((project.results[0]?.relevance ?? 0) * 100)}%`}
          hint="Keyword overlap with your query"
        />
        <Stat label="Retrieved" value={formatDate(project.retrievedAt)} />
        <Stat label="Source host" value={hostFromUrl(project.sourceUrl)} />
      </div>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader
            title="Structured facts"
            description="Only what the source actually stated. Missing fields are labelled rather than filled in."
          />
          <CardBody>
            <dl className="grid gap-5 sm:grid-cols-2">
              {field("Problem addressed", project.problemAddressed)}
              {field("Proposed solution", project.proposedSolution)}
              {field("Target users", project.targetUsers)}
              {field("Business model", project.businessModel)}
              {field("Distribution", project.distribution)}
              {field(
                "Award / ranking",
                project.award
                  ? `${project.award} — ${
                      project.awardVerified
                        ? "verified from the source"
                        : "stated by the source, not independently verified"
                    }`
                  : null,
              )}
            </dl>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                Technologies
              </p>
              {technologies.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {technologies.map((technology) => (
                    <Tag key={technology} tone="paper">
                      {technology}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-ink/50">Not stated in the source</p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Source attribution" />
          <CardBody className="space-y-4">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Attribution
                </dt>
                <dd className="mt-1 text-ink">{project.attribution}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Source id
                </dt>
                <dd className="mt-1 text-ink">{project.sourceId}</dd>
              </div>
            </dl>

            {discovery.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Discovery metadata
                </p>
                <ul className="mt-2 space-y-2">
                  {discovery.map((item, index) => (
                    <li
                      key={`${item.sourceId}-${index}`}
                      className="rounded-lg border-[3px] border-ink bg-paper px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag tone="paper">{item.accessMode}</Tag>
                        <span className="text-xs text-ink/60">
                          {item.sourceName} · retrieved {item.retrievedAt}
                        </span>
                      </div>
                      {item.snippet ? (
                        <p className="mt-1.5 text-ink/70">{item.snippet}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {sources.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Source pages referenced
                </p>
                <ul className="mt-2 space-y-1.5">
                  {sources.map((source) => (
                    <li key={source.id} className="text-sm">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-medium text-punch hover:underline"
                      >
                        {source.title ?? source.url}
                      </a>
                      <span className="ml-2 text-xs text-ink/60">
                        {source.sourceName} · access: {source.accessMode} ·{" "}
                        {formatDate(source.retrievedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Uncertainty"
            description="What ProjectScope could not determine about this record."
          />
          <CardBody>
            {uncertainty.length ? (
              <ul className="space-y-2 text-sm text-ink/80">
                {uncertainty.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="text-warn" aria-hidden>
                      •
                    </span>
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/60">
                No specific uncertainty was recorded for this record.
              </p>
            )}
          </CardBody>
        </Card>

        {project.results.length > 0 ? (
          <Card>
            <CardHeader title="Appears in" />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {project.results.map((result) => (
                  <li key={result.job.id}>
                    <Link
                      href={`/research/${result.job.id}`}
                      className="font-medium text-punch hover:underline"
                    >
                      {result.job.topic}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
