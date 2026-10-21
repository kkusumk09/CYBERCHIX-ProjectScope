import type { Metadata } from "next";
import Link from "next/link";

import { DiscoveryStudio } from "@/components/discovery-studio";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { sourceCheckSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Find me a winning project idea",
  description:
    "No problem statement required. ProjectScope researches permitted sources, finds the gaps and proposes five ranked, buildable project ideas.",
};

export const dynamic = "force-dynamic";

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const params = await searchParams;
  const discoveryId = typeof params.discoveryId === "string" ? params.discoveryId : "";

  const discovery = discoveryId
    ? await prisma.ideaDiscovery.findUnique({
        where: { id: discoveryId },
        include: { job: true },
      })
    : null;

  const recent = await prisma.ideaDiscovery.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { job: { select: { resultCount: true } } },
  });

  const initial = discovery
    ? {
        id: discovery.id,
        jobId: discovery.jobId,
        interests: discovery.interests,
        techPreferences: discovery.techPreferences,
        teamCapabilities: discovery.teamCapabilities,
        constraints: discovery.constraints,
        status: discovery.status,
        stage: discovery.stage,
        isDemo: discovery.isDemo,
        errorMessage: discovery.errorMessage,
        concepts: parseJson(discovery.concepts, []),
        recommendation: parseJson(discovery.recommendation, null),
        analysis: parseJson(discovery.analysis, {}),
        sourcesChecked: parseJson(discovery.job.sourcesChecked, [], sourceCheckSchema.array()),
        resultCount: discovery.job.resultCount,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Find Me a Winning Project Idea
        </h1>
        <p className="mt-2 max-w-3xl text-ink/70">
          You do not need a problem statement. ProjectScope researches past winners, existing
          projects, emerging technology and real-world problems on the permitted sources, works out
          what the field keeps doing and who it keeps missing, then designs and ranks five
          buildable concepts for you.
        </p>
      </div>

      <DiscoveryStudio key={discovery?.id ?? "new"} initial={initial} />

      {recent.length > 0 && !discoveryId ? (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Previous discovery runs
          </h2>
          <ul className="mt-3 space-y-2">
            {recent.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/discover?discoveryId=${run.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border-[3px] border-ink bg-paper-2 px-4 py-3 text-sm transition-colors hover:border-ink"
                >
                  <span className="font-medium text-ink">
                    {run.job.resultCount} record(s) ·{" "}
                    {parseJson<unknown[]>(run.concepts, []).length} concept(s)
                  </span>
                  <span className="text-xs text-ink/60">
                    {run.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
