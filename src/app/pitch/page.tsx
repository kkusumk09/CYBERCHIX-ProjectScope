import type { Metadata } from "next";
import Link from "next/link";

import { JobSelect } from "@/components/job-select";
import { PitchStudio } from "@/components/pitch-studio";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { pitchContentSchema, type PitchContent } from "@/lib/schema";

const EMPTY_PITCH: PitchContent = {
  problem: "",
  targetUser: "",
  solution: "",
  differentiator: "",
  valueProposition: "",
  validationResults: "",
  businessModel: "",
  goToMarket: "",
  demoOutline: [],
  judgeQuestions: [],
  attribution: [],
  honestyNotes: [],
};

export const metadata: Metadata = {
  title: "Pitch Studio",
};

export const dynamic = "force-dynamic";

export default async function PitchPage({ searchParams }: PageProps<"/pitch">) {
  const params = await searchParams;
  const jobId = typeof params.jobId === "string" ? params.jobId : "";

  const jobs = await prisma.researchJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, topic: true, isDemo: true },
  });

  if (!jobId) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Pitch Studio
        </h1>
        <div className="mt-4">
          <JobSelect jobs={jobs} label="Research run" />
        </div>
        <div className="mt-8">
          <EmptyState
            title="Pick a research run"
            description="The pitch is written from your notes and the evidence you collected, so attribution section accurate."
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
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState title="That run does not exist" description="Pick another run from the dropdown." />
      </div>
    );
  }

  const [conceptRows, pitchRow] = await Promise.all([
    prisma.proposedConcept.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, tagline: true },
    }),
    prisma.pitch.findUnique({ where: { jobId } }),
  ]);

  const initialPitch = pitchRow
    ? {
        id: pitchRow.id,
        content: parseJson(pitchRow.content, EMPTY_PITCH, pitchContentSchema),
        clarityScore: pitchRow.clarityScore,
        clarityNotes: parseJson<string[]>(pitchRow.clarityNotes, []),
        isDemo: pitchRow.isDemo,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Pitch Studio
          </h1>
          <p className="mt-2 max-w-3xl text-ink/70">
            Built from the evidence collected for{" "}
            <span className="font-medium text-ink">{job.topic}</span> and from
            what you actually did. Never claim a test result you do not have.
          </p>
        </div>
        <JobSelect jobs={jobs} currentJobId={jobId} />
      </div>

      {/* `key` forces a remount when the run changes, so the studio never
          shows the previous run's pitch. */}
      <PitchStudio
        key={jobId}
        jobId={jobId}
        concepts={conceptRows}
        initialPitch={initialPitch}
      />
    </div>
  );
}
