import type { Metadata } from "next";
import Link from "next/link";

import { ExportButtons } from "@/components/export-buttons";
import { JobSelect } from "@/components/job-select";
import { ReportGenerator } from "@/components/report-generator";
import { Alert, Tag, Card, CardBody, CardHeader, EmptyState, Stat } from "@/components/ui";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import {
  marketGapSchema,
  type CompetitorProfile,
  type RepeatedPattern,
  type SourceLink,
} from "@/lib/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Market-gap report",
};

export const dynamic = "force-dynamic";

const CONFIDENCE_TONE = {
  high: "mint",
  medium: "acid",
  low: "punch",
} as const;

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const params = await searchParams;
  const jobId = typeof params.jobId === "string" ? params.jobId : "";

  const jobs = await prisma.researchJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, topic: true, isDemo: true },
  });

  const job = jobId
    ? await prisma.researchJob.findUnique({
        where: { id: jobId },
        include: {
          report: true,
          results: { include: { project: true } },
          experiments: { orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  if (!jobId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Market-gap report
        </h1>
        <div className="mt-4">
          <JobSelect jobs={jobs} label="Research run" />
        </div>
        <div className="mt-8">
          <EmptyState
            title="Pick a research run"
            description="Choose a run above to read the gaps, patterns and validation experiments that were found from its evidence."
            action={
              <Link
                href="/research"
                className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-paper-2 hover:bg-ink-soft"
              >
                Start a new research run
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState
          title="That run does not exist"
          description="Pick another research run from the dropdown."
        />
      </div>
    );
  }

  const report = job.report;
  const gaps = parseJson(report?.gaps, [], marketGapSchema.array());
  const patterns = parseJson<RepeatedPattern[]>(report?.patterns, []);
  const competitors = parseJson<CompetitorProfile[]>(report?.competitors, []);
  const assumptions = parseJson<Array<{ assumption: string; whyItMatters: string; howToValidate: string }>>(
    report?.assumptions,
    [],
  );
  const sources = parseJson<SourceLink[]>(report?.sources, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Market-gap report
          </h1>
          <p className="mt-2 max-w-3xl text-ink/70">
            Based on {job.resultCount} record{job.resultCount === 1 ? "" : "s"} collected for{" "}
            <span className="font-medium text-ink">{job.topic}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <JobSelect jobs={jobs} currentJobId={jobId} />
          <ExportButtons jobId={jobId} />
        </div>
      </div>

      <div className="mb-6">
        <ReportGenerator
          jobId={jobId}
          label={report ? "Regenerate report" : "Generate the report"}
        />
      </div>

      {job.isDemo ? (
        <Alert tone="warn" title="Demo mode">
          This report was produced from the bundled sample dataset because no provider credentials
          are configured. It is a demonstration of the format, not research about a real market.
        </Alert>
      ) : null}

      {!report ? (
        <div className="mt-6">
          <EmptyState
            title="No report yet"
            description="The pipeline writes a report automatically, or you can generate one now from the records that were collected."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <Card>
            <CardBody>
              <p className="text-sm leading-relaxed text-ink/80">
                {report.summary}
              </p>
            </CardBody>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Gaps identified" value={gaps.length} />
            <Stat label="Repeated patterns" value={patterns.length} />
            <Stat label="Sources cited" value={sources.length} />
          </div>

          {/* Gaps */}
          <section>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Gaps
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Each gap separates the observation from the evidence, and the evidence from our
              reasoning.
            </p>

            {gaps.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No gaps recorded" description="The analysis did not return any gaps." />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {gaps.map((gap) => (
                  <Card key={gap.id}>
                    <CardHeader
                      title={gap.title}
                      description={gap.observation}
                      action={
                        <div className="flex flex-wrap gap-1.5">
                          <Tag tone={gap.claimType === "evidence" ? "mint" : "acid"}>
                            {gap.claimType === "evidence" ? "evidence-backed" : "hypothesis"}
                          </Tag>
                          <Tag tone={CONFIDENCE_TONE[gap.confidence]}>
                            {gap.confidence} confidence
                          </Tag>
                        </div>
                      }
                    />
                    <CardBody className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          Supporting evidence
                        </p>
                        <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
                          {gap.supportingEvidence.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="text-punch" aria-hidden>
                                •
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {gap.sourceUrls.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Source links
                          </p>
                          <ul className="mt-1.5 flex flex-wrap gap-2 text-sm">
                            {gap.sourceUrls.map((url) => (
                              <li key={url}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="font-medium text-punch hover:underline"
                                >
                                  {url.replace(/^https?:\/\//, "").slice(0, 58)} ↗
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Assumptions
                          </p>
                          <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
                            {gap.assumptions.length ? (
                              gap.assumptions.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <span className="text-warn" aria-hidden>
                                    •
                                  </span>
                                  {item}
                                </li>
                              ))
                            ) : (
                              <li className="text-ink/50">None recorded.</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Affected users
                          </p>
                          <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
                            {gap.affectedUsers.length ? (
                              gap.affectedUsers.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <span className="text-punch" aria-hidden>
                                    •
                                  </span>
                                  {item}
                                </li>
                              ))
                            ) : (
                              <li className="text-ink/50">None recorded.</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="grid gap-4 rounded-xl bg-paper p-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Proposed improvement
                          </p>
                          <p className="mt-1 text-sm text-ink">
                            {gap.proposedImprovement || "Not stated."}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Potential business value
                          </p>
                          <p className="mt-1 text-sm text-ink">
                            {gap.potentialBusinessValue || "Not stated."}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Validation experiment
                          </p>
                          <p className="mt-1 text-sm text-ink">
                            {gap.validationExperiment || "Not stated."}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Patterns */}
          {patterns.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                Repeated patterns
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {patterns.map((pattern) => (
                  <Card key={pattern.pattern}>
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">
                          {pattern.pattern}
                        </p>
                        <Tag tone="paper">seen {pattern.evidenceCount}×</Tag>
                      </div>
                      {pattern.occurrences.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-ink/70">
                          {pattern.occurrences.map((occurrence) => (
                            <li key={occurrence} className="flex gap-2">
                              <span className="text-ink/50" aria-hidden>
                                •
                              </span>
                              {occurrence}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {/* Competitors */}
          {competitors.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                Competitor comparison
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      {["Project", "Approach", "Target users", "Business model", "Distribution", "Evidenced limitations"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="border-[3px] border-b-[3px] border-ink px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink/60"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((competitor) => (
                      <tr key={`${competitor.name}-${competitor.url}`} className="align-top">
                        <td className="border-[3px] border-b-[3px] border-ink px-3 py-2.5 font-medium text-ink">
                          {competitor.url ? (
                            <a
                              href={competitor.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="hover:text-punch hover:underline"
                            >
                              {competitor.name} ↗
                            </a>
                          ) : (
                            competitor.name
                          )}
                        </td>
                        <td className="border-[3px] border-b-[3px] border-ink px-3 py-2.5 text-ink/80">
                          {competitor.approach || "—"}
                        </td>
                        <td className="border-[3px] border-b-[3px] border-ink px-3 py-2.5 text-ink/80">
                          {competitor.targetUsers || "—"}
                        </td>
                        <td className="border-[3px] border-b-[3px] border-ink px-3 py-2.5 text-ink/80">
                          {competitor.businessModel || "—"}
                        </td>
                        <td className="border-[3px] border-b-[3px] border-ink px-3 py-2.5 text-ink/80">
                          {competitor.distribution || "—"}
                        </td>
                        <td className="border-[3px] border-b-[3px] border-ink px-3 py-2.5 text-ink/80">
                          {competitor.limitations.length ? (
                            <ul className="space-y-1">
                              {competitor.limitations.map((limitation) => (
                                <li key={limitation}>• {limitation}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-ink/50">none evidenced</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* Assumptions */}
          {assumptions.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                Assumptions
              </h2>
              <div className="mt-4 space-y-3">
                {assumptions.map((assumption) => (
                  <Card key={assumption.assumption}>
                    <CardBody>
                      <p className="text-sm font-semibold text-ink">
                        {assumption.assumption}
                      </p>
                      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Why it matters
                          </dt>
                          <dd className="mt-0.5 text-ink/80">
                            {assumption.whyItMatters || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            How to validate
                          </dt>
                          <dd className="mt-0.5 text-ink/80">
                            {assumption.howToValidate || "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {/* Sources */}
          {sources.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                Sources cited
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-medium text-punch hover:underline"
                    >
                      {source.title || source.url} ↗
                    </a>
                    {source.source ? (
                      <span className="ml-2 text-xs text-ink/60">{source.source}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Validation experiments
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Run these before you claim the gap is real. They are the difference between a
              hypothesis and a finding.
            </p>
            <div className="mt-4 space-y-3">
              {job.experiments.length === 0 ? (
                <EmptyState title="No experiments proposed yet" />
              ) : (
                job.experiments.map((experiment) => (
                  <Card key={experiment.id}>
                    <CardBody>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">
                          {experiment.title}
                        </p>
                        <div className="flex gap-1.5">
                          {experiment.duration ? (
                            <Tag tone="paper">{experiment.duration}</Tag>
                          ) : null}
                          {experiment.cost ? <Tag tone="paper">{experiment.cost}</Tag> : null}
                        </div>
                      </div>
                      <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Hypothesis
                          </dt>
                          <dd className="mt-0.5 text-ink/80">
                            {experiment.hypothesis}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Method
                          </dt>
                          <dd className="mt-0.5 text-ink/80">
                            {experiment.method}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Metric
                          </dt>
                          <dd className="mt-0.5 text-ink/80">
                            {experiment.metric}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                            Success criteria
                          </dt>
                          <dd className="mt-0.5 text-ink/80">
                            {experiment.successCriteria}
                          </dd>
                        </div>
                      </dl>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          </section>

          <div className={cn("flex flex-wrap gap-2")}>
            <Link
              href={`/ideas?jobId=${job.id}`}
              className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-paper-2 shadow-sm hover:bg-ink-soft"
            >
              Design an idea from these gaps
            </Link>
            <Link
              href={`/pitch?jobId=${job.id}`}
              className="inline-flex h-10 items-center rounded-lg border-[3px] border-ink bg-paper-2 px-4 text-sm font-semibold shadow-sm hover:bg-paper"
            >
              Build the pitch
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
