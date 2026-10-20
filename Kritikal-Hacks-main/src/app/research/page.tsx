import type { Metadata } from "next";
import Link from "next/link";

import { ResearchForm } from "@/components/research-form";
import { Tag, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Configure research",
};

export const dynamic = "force-dynamic";

export default async function ResearchPage({ searchParams }: PageProps<"/research">) {
  const params = await searchParams;
  const initialTopic = typeof params.topic === "string" ? params.topic : "";

  const recent = await prisma.researchJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      topic: true,
      status: true,
      resultCount: true,
      isDemo: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Configure your research
        </h1>
        <p className="mt-2 max-w-3xl text-ink/70">
          ProjectScope will search the permitted sources, deduplicate and normalise what it finds,
          then analyse the evidence for gaps. You can watch it happen in real time.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ResearchForm initialTopic={initialTopic} />

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Recent runs" />
            <CardBody className="p-0">
              {recent.length === 0 ? (
                <div className="px-5 py-6 text-sm text-ink/60">No research runs yet.</div>
              ) : (
                <ul className="divide-[3px]-y divide-ink">
                  {recent.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/research/${job.id}`}
                        className="block px-5 py-3 transition-colors hover:bg-paper"
                      >
                        <p className="line-clamp-2 text-sm font-medium text-ink">
                          {job.topic}
                        </p>
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
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="What you will get" />
            <CardBody className="space-y-2 text-sm text-ink/70">
              <p>• A project explorer with keyword, platform, award, technology and domain filters.</p>
              <p>• A market-gap report with the evidence and source link behind every claim.</p>
              <p>• A comparison workspace for the approaches you found.</p>
              <p>• Differentiated concepts with an explicit similarity check.</p>
              <p>• A pitch with judge questions and honesty notes.</p>
            </CardBody>
          </Card>

          {recent.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              description="Run your first search and it will show up in this list under Saved research."
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
