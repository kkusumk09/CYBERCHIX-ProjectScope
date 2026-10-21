import type { Metadata } from "next";
import Link from "next/link";

import { CompareWorkspace } from "@/components/compare-workspace";
import { JobSelect } from "@/components/job-select";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { queryProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Comparison workspace",
};

export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const params = await searchParams;
  const jobId = typeof params.jobId === "string" ? params.jobId : "";

  const jobs = await prisma.researchJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, topic: true, isDemo: true },
  });

  if (!jobId) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Comparison workspace
        </h1>
        <div className="mt-4">
          <JobSelect jobs={jobs} label="Research run" />
        </div>
        <div className="mt-8">
          <EmptyState
            title="Pick a research run"
            description="Choose the run whose approaches you want to line up side by side."
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
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState title="That run does not exist" description="Pick another run from the dropdown." />
      </div>
    );
  }

  const { projects } = await queryProjects({ jobId, pageSize: 60 });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Comparison workspace
          </h1>
          <p className="mt-2 max-w-3xl text-ink/70">
            {job.resultCount} record{job.resultCount === 1 ? "" : "s"} collected for{" "}
            <span className="font-medium text-ink">{job.topic}</span>. Select
            two to six to compare their approach, users, business model, distribution and the
            limitations the records actually evidence.
          </p>
        </div>
        <JobSelect jobs={jobs} currentJobId={jobId} />
      </div>

      {/* `key` forces a remount when the run changes, so the selection made
          for the previous run is never posted against the new one. */}
      <CompareWorkspace key={jobId} jobId={jobId} projects={projects} />
    </div>
  );
}
