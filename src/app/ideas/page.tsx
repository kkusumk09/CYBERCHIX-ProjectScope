import type { Metadata } from "next";
import Link from "next/link";

import { IdeaStudio } from "@/components/idea-studio";
import { JobSelect } from "@/components/job-select";
import { Alert, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";

export const metadata: Metadata = {
  title: "Original Idea Studio",
};

export const dynamic = "force-dynamic";

export default async function IdeasPage({ searchParams }: PageProps<"/ideas">) {
  const params = await searchParams;
  const jobId = typeof params.jobId === "string" ? params.jobId : "";

  const jobs = await prisma.researchJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, topic: true, isDemo: true },
  });

  if (!jobId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Original Idea Studio
        </h1>
        <div className="mt-4">
          <JobSelect jobs={jobs} label="Research run" />
        </div>
        <div className="mt-8">
          <EmptyState
            title="Pick a research run"
            description="The Idea Studio designs concepts against the projects that already exist, so the comparison is real rather than decorative."
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

  const job = await prisma.researchJob.findUnique({
    where: { id: jobId },
    select: { id: true, topic: true, isDemo: true, resultCount: true },
  });

  if (!job) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState title="That run does not exist" description="Pick another run from the dropdown." />
      </div>
    );
  }

  const conceptRows = await prisma.proposedConcept.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
  });

  const initialConcepts = conceptRows.map((concept) => ({
    id: concept.id,
    title: concept.title,
    tagline: concept.tagline,
    problem: concept.problem,
    targetUsers: concept.targetUsers,
    solution: concept.solution,
    differentiators: parseJson<string[]>(concept.differentiators, []),
    comparisons: parseJson(concept.comparisons, []),
    risks: parseJson<string[]>(concept.risks, []),
    validationPlan: concept.validationPlan,
    similarityWarning: concept.similarityWarning,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Original Idea Studio
          </h1>
          <p className="mt-2 max-w-3xl text-ink/70">
            Concepts are designed against the {job.resultCount} record
            {job.resultCount === 1 ? "" : "s"} collected for{" "}
            <span className="font-medium text-ink">{job.topic}</span>. Every
            concept names the existing work it overlaps with.
          </p>
        </div>
        <JobSelect jobs={jobs} currentJobId={jobId} />
      </div>

      {job.isDemo ? (
        <Alert tone="warn" title="Demo mode" className="mb-6">
          No provider credentials are configured, so concepts come from the bundled sample dataset
          rather than a live model.
        </Alert>
      ) : null}

      {job.resultCount === 0 ? (
        <Alert tone="warn" title="No evidence to work from" className="mb-6">
          This run collected no project records, so any concept would be invented rather than
          differentiated. Run a research job with a broader query first.
        </Alert>
      ) : null}

      {/* `key` forces a remount when the run changes, so the studio never
          shows the previous run's concepts. */}
      <IdeaStudio key={jobId} jobId={jobId} initialConcepts={initialConcepts} />
    </div>
  );
}
