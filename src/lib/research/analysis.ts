import "server-only";

/**
 * Analysis orchestration.
 *
 * These functions sit between the route handlers and the provider clients.
 * They read the stored evidence for a job, call the right provider, and write
 * the result back with attribution, timestamps and uncertainty notes.
 */
import { z } from "zod";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { parseJson, stringifyJson } from "@/lib/json";
import {
  experimentSchema,
  marketGapSchema,
  pitchContentSchema,
  type MarketGapReport,
  type PitchContent,
} from "@/lib/schema";

import { compareProjects, generateConcepts, reviewPitch } from "@/lib/providers/openai";
import { generateMarketGapReport, type EvidenceItem } from "@/lib/providers/gemini";

import { DEMO_REPORT } from "@/lib/research/demo";

/** Load a job plus its projects, newest rank first. */
export async function loadJobWithProjects(jobId: string) {
  const job = await prisma.researchJob.findUnique({
    where: { id: jobId },
    include: {
      results: {
        orderBy: { rank: "asc" },
        include: { project: true },
      },
    },
  });

  if (!job) {
    throw new AppError("not_found", "That research job does not exist.");
  }

  return job;
}

export function projectToEvidence(project: {
  title: string;
  platform: string;
  sourceUrl: string;
  summary: string;
  problemAddressed: string | null;
  proposedSolution: string | null;
  targetUsers: string | null;
  technologies: string;
}): EvidenceItem {
  return {
    title: project.title,
    platform: project.platform,
    url: project.sourceUrl,
    summary: project.summary,
    problemAddressed: project.problemAddressed ?? "",
    proposedSolution: project.proposedSolution ?? "",
    targetUsers: project.targetUsers ?? "",
    technologies: parseJson<string[]>(project.technologies, []),
    sourceName: project.platform,
  };
}

/* -------------------------------------------------------------------------- */
/* Market gap report                                                          */
/* -------------------------------------------------------------------------- */

export async function runAnalysis(jobId: string, focus: string): Promise<MarketGapReport> {
  const job = await loadJobWithProjects(jobId);

  if (isDemoMode()) {
    const report = DEMO_REPORT as unknown as MarketGapReport;
    await prisma.marketGapReport.upsert({
      where: { jobId },
      create: {
        jobId,
        summary: report.summary,
        gaps: stringifyJson(report.gaps),
        patterns: stringifyJson(report.patterns),
        competitors: stringifyJson(report.competitors),
        assumptions: stringifyJson(report.assumptions),
        experiments: stringifyJson(report.experiments),
        sources: stringifyJson(report.sources),
        isDemo: true,
      },
      update: {
        summary: report.summary,
        gaps: stringifyJson(report.gaps),
        patterns: stringifyJson(report.patterns),
        competitors: stringifyJson(report.competitors),
        assumptions: stringifyJson(report.assumptions),
        experiments: stringifyJson(report.experiments),
        sources: stringifyJson(report.sources),
        isDemo: true,
      },
    });
    return report;
  }

  const evidence = job.results.map((result) => projectToEvidence(result.project));
  if (evidence.length === 0) {
    throw new AppError(
      "validation_error",
      "This research job has no project records yet, so there is nothing to analyse.",
    );
  }

  const { report, citations, usedSearchGrounding } = await generateMarketGapReport({
    topic: job.topic,
    problemStatement: job.problemStatement ?? "",
    domain: job.domain ?? "",
    targetUsers: job.targetUsers ?? "",
    geography: job.geography ?? "",
    evidence,
    focus,
    useSearchGrounding: true,
  });

  const mergedSources = [...report.sources];
  for (const citation of citations) {
    if (!mergedSources.some((source) => source.url === citation.url)) {
      mergedSources.push(citation);
    }
  }

  await prisma.marketGapReport.upsert({
    where: { jobId },
    create: {
      jobId,
      summary: report.summary,
      gaps: stringifyJson(report.gaps),
      patterns: stringifyJson(report.patterns),
      competitors: stringifyJson(report.competitors),
      assumptions: stringifyJson(report.assumptions),
      experiments: stringifyJson(report.experiments),
      sources: stringifyJson(mergedSources),
      isDemo: false,
    },
    update: {
      summary: report.summary,
      gaps: stringifyJson(report.gaps),
      patterns: stringifyJson(report.patterns),
      competitors: stringifyJson(report.competitors),
      assumptions: stringifyJson(report.assumptions),
      experiments: stringifyJson(report.experiments),
      sources: stringifyJson(mergedSources),
    },
  });

  // Replace the experiment set so a re-run does not duplicate rows.
  await prisma.validationExperiment.deleteMany({ where: { jobId } });
  for (const experiment of report.experiments) {
    await prisma.validationExperiment.create({
      data: {
        jobId,
        title: experiment.title,
        hypothesis: experiment.hypothesis,
        method: experiment.method,
        metric: experiment.metric,
        successCriteria: experiment.successCriteria,
        duration: experiment.duration,
        cost: experiment.cost,
        relatedGapId: experiment.relatedGapId || null,
      },
    });
  }

  void usedSearchGrounding;
  return { ...report, sources: mergedSources };
}

export async function readAnalysis(jobId: string) {
  const report = await prisma.marketGapReport.findUnique({ where: { jobId } });
  if (!report) return null;

  return {
    id: report.id,
    jobId: report.jobId,
    summary: report.summary,
    gaps: parseJson(report.gaps, [], z.array(marketGapSchema)),
    patterns: parseJson(report.patterns, []),
    competitors: parseJson(report.competitors, []),
    assumptions: parseJson(report.assumptions, []),
    experiments: parseJson(report.experiments, [], z.array(experimentSchema)),
    sources: parseJson(report.sources, []),
    isDemo: report.isDemo,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Idea Studio                                                                */
/* -------------------------------------------------------------------------- */

export async function runConcepts(jobId: string, constraints: string, count: number) {
  const job = await loadJobWithProjects(jobId);
  const report = await prisma.marketGapReport.findUnique({ where: { jobId } });
  const gaps = parseJson(report?.gaps, [], z.array(marketGapSchema));

  if (isDemoMode()) {
    const demo = {
      concepts: [
        {
          title: "Demo concept: Offline-first assistive companion for low-bandwidth clinics",
          tagline: "Works without a connection, escalates only when a human must.",
          problem:
            "Health workers in low-connectivity areas lose triage context every time the network drops.",
          targetUsers: "Community health workers in low-connectivity areas",
          solution:
            "An offline-first triage log with a deterministic escalation list and a deferred sync queue.",
          differentiators: [
            "Every feature works with the radio off — the common case in the sampled records was assumed connectivity.",
            "Escalation is rule-based and auditable rather than model-generated, which matches the trust requirement in the sampled brief.",
          ],
          comparisons: [
            {
              existingProjectTitle: "Sample: Telehealth triage assistant for rural clinics",
              existingProjectUrl: "https://unstop.com/demo/rural-triage-assistant",
              overlap: "Both target community health workers with a triage workflow.",
              similarity: 0.62,
              differences: [
                "This concept treats the offline case as the default rather than an edge case.",
                "Escalation is deterministic instead of model-generated.",
              ],
            },
          ],
          risks: [
            "No user has been interviewed yet.",
            "The assumption that a rule-based escalation list is acceptable to clinicians is untested.",
          ],
          validationPlan:
            "Run three offline sessions with health workers using a paper-equivalent prototype; measure whether triage decisions match a supervisor's review.",
          similarityWarning: "",
        },
      ],
      commonGround: [
        "A mobile-first interface",
        "An AI or rules layer over a workflow that already exists",
        "Institutional distribution rather than a consumer app store",
      ],
      unvalidated: [
        "That offline operation is the binding constraint for the target users.",
        "That the target users would adopt a tool at all without a procurement decision.",
      ],
    };
    return demo;
  }

  const result = await generateConcepts({
    constraints: [
      constraints ? `User constraints: ${constraints}` : "",
      `Number of concepts requested: ${count}.`,
      job.problemStatement ? `User's problem statement: ${job.problemStatement}` : "",
      job.domain ? `Domain: ${job.domain}` : "",
      job.targetUsers ? `Target users: ${job.targetUsers}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    existingProjects: job.results.slice(0, 25).map((result) => ({
      title: result.project.title,
      platform: result.project.platform,
      url: result.project.sourceUrl,
      summary: result.project.summary,
      problemAddressed: result.project.problemAddressed ?? "",
      proposedSolution: result.project.proposedSolution ?? "",
      targetUsers: result.project.targetUsers ?? "",
      technologies: parseJson<string[]>(result.project.technologies, []),
    })),
    gaps: gaps.map((gap) => ({ id: gap.id, title: gap.title, observation: gap.observation })),
  });

  await prisma.proposedConcept.deleteMany({ where: { jobId } });
  for (const concept of result.concepts) {
    await prisma.proposedConcept.create({
      data: {
        jobId,
        title: concept.title,
        tagline: concept.tagline,
        problem: concept.problem,
        targetUsers: concept.targetUsers,
        solution: concept.solution,
        differentiators: stringifyJson(concept.differentiators),
        comparisons: stringifyJson(concept.comparisons),
        risks: stringifyJson(concept.risks),
        validationPlan: concept.validationPlan,
        similarityWarning: concept.similarityWarning || null,
      },
    });
  }

  return result;
}

export async function readConcepts(jobId: string) {
  const rows = await prisma.proposedConcept.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    problem: row.problem,
    targetUsers: row.targetUsers,
    solution: row.solution,
    differentiators: parseJson<string[]>(row.differentiators, []),
    comparisons: parseJson(row.comparisons, []),
    risks: parseJson<string[]>(row.risks, []),
    validationPlan: row.validationPlan,
    similarityWarning: row.similarityWarning,
    createdAt: row.createdAt.toISOString(),
  }));
}

/* -------------------------------------------------------------------------- */
/* Pitch Studio                                                               */
/* -------------------------------------------------------------------------- */

export async function runPitch(jobId: string, conceptId: string, extra: string): Promise<PitchContent> {
  const job = await loadJobWithProjects(jobId);
  const concept = conceptId
    ? await prisma.proposedConcept.findFirst({ where: { id: conceptId, jobId } })
    : await prisma.proposedConcept.findFirst({ where: { jobId }, orderBy: { createdAt: "asc" } });
  const experiments = await prisma.validationExperiment.findMany({ where: { jobId } });
  const report = await prisma.marketGapReport.findUnique({ where: { jobId } });
  const gaps = parseJson(report?.gaps, [], z.array(marketGapSchema));

  if (isDemoMode()) {
    const content: PitchContent = {
      problem: job.problemStatement || "Students with a stated problem are not served by the sampled approaches.",
      targetUser: job.targetUsers || "The target user the user described.",
      solution: "A demo pitch. No live model was called, so this text is a placeholder with the shape of a real pitch.",
      differentiator:
        "Demo mode. The differentiator is where the real analysis would go — it comes from comparing your idea with the collected projects.",
      valueProposition: "Demo mode placeholder.",
      validationResults:
        "No experiments have been run. Run the suggested experiments and report the real numbers here — never a placeholder.",
      businessModel: "Demo mode placeholder.",
      goToMarket: "Demo mode placeholder.",
      demoOutline: [
        "1. The problem (30 seconds)",
        "2. Who has it (30 seconds)",
        "3. The demo (2 minutes)",
        "4. How you tested it (1 minute)",
        "5. What you would do next (30 seconds)",
      ],
      judgeQuestions: [
        "How do you know this problem is real for the users you named?",
        "What did you actually test, and what happened?",
        "Why would someone switch to your solution rather than the alternatives you researched?",
      ],
      attribution: job.results.map((result) => result.project.attribution),
      honestyNotes: [
        "This pitch was generated in demo mode without a live model.",
        "Replace every placeholder with your real implementation, tests and results before presenting.",
      ],
    };

    await prisma.pitch.upsert({
      where: { jobId },
      create: { jobId, content: stringifyJson(content), clarityScore: null, clarityNotes: stringifyJson([]), isDemo: true },
      update: { content: stringifyJson(content), clarityNotes: stringifyJson([]), isDemo: true },
    });

    return content;
  }

  const review = await reviewPitch({
    notes: [
      job.problemStatement ? `Problem statement: ${job.problemStatement}` : "",
      job.targetUsers ? `Target users: ${job.targetUsers}` : "",
      job.domain ? `Domain: ${job.domain}` : "",
      concept
        ? `Chosen concept: ${concept.title} — ${concept.tagline}\nSolution: ${concept.solution}\nTarget users: ${concept.targetUsers}\nPlanned differentiators: ${parseJson<string[]>(concept.differentiators, []).join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    extra,
    concept: concept
      ? {
          title: concept.title,
          tagline: concept.tagline,
          solution: concept.solution,
          targetUsers: concept.targetUsers,
        }
      : null,
    existingProjects: job.results.slice(0, 20).map((result) => ({
      title: result.project.title,
      platform: result.project.platform,
      url: result.project.sourceUrl,
      summary: result.project.summary,
    })),
    experiments: experiments.map((experiment) => ({
      title: experiment.title,
      hypothesis: experiment.hypothesis,
      method: experiment.method,
      metric: experiment.metric,
    })),
    gaps: gaps.map((gap) => ({
      title: gap.title,
      observation: gap.observation,
      proposedImprovement: gap.proposedImprovement,
    })),
  });

  await prisma.pitch.upsert({
    where: { jobId },
    create: {
      jobId,
      content: stringifyJson(review.content),
      clarityScore: review.clarityScore,
      clarityNotes: stringifyJson(review.clarityNotes),
      isDemo: false,
    },
    update: {
      content: stringifyJson(review.content),
      clarityScore: review.clarityScore,
      clarityNotes: stringifyJson(review.clarityNotes),
    },
  });

  return review.content;
}

export async function readPitch(jobId: string) {
  const pitch = await prisma.pitch.findUnique({ where: { jobId } });
  if (!pitch) return null;
  return {
    id: pitch.id,
    jobId: pitch.jobId,
    content: parseJson(pitch.content, {} as PitchContent, pitchContentSchema),
    clarityScore: pitch.clarityScore,
    clarityNotes: parseJson<string[]>(pitch.clarityNotes, []),
    isDemo: pitch.isDemo,
    updatedAt: pitch.updatedAt.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Comparison workspace                                                       */
/* -------------------------------------------------------------------------- */

export async function runComparison(jobId: string, projectIds: string[]) {
  const job = await loadJobWithProjects(jobId);
  const chosen = job.results
    .filter((result) => projectIds.includes(result.projectId))
    .map((result) => result.project);

  if (chosen.length < 2) {
    throw new AppError("validation_error", "Select at least two projects to compare.");
  }

  if (isDemoMode()) {
    return {
      comparisons: chosen.map((project) => ({
        title: project.title,
        url: project.sourceUrl,
        platform: project.platform,
        approach: project.proposedSolution ?? project.summary,
        targetUsers: project.targetUsers ?? "",
        businessModel: project.businessModel ?? "",
        distribution: project.distribution ?? "",
        evidencedLimitations: parseJson<string[]>(project.uncertaintyNotes, []),
        award: project.award ?? "",
        awardVerified: project.awardVerified,
      })),
      repeatedPatterns: [
        "Every sampled record uses a mobile or browser client.",
        "Every sampled record is distributed through an institution rather than an app store.",
      ],
      commonTargetUsers: [],
      commonBusinessModels: [],
      commonDistribution: [],
      sharedAssumptions: [
        "That the target user will adopt a tool that requires a new habit.",
      ],
      differences: [
        "The records differ in whether they are built for a physical constraint or a workflow constraint.",
        "Only one record targets a permanent sensory or mobility constraint.",
      ],
      isDemo: true,
    };
  }

  const result = await compareProjects(
    chosen.map((project) => ({
      title: project.title,
      url: project.sourceUrl,
      platform: project.platform,
      summary: project.summary,
      problemAddressed: project.problemAddressed ?? "",
      proposedSolution: project.proposedSolution ?? "",
      targetUsers: project.targetUsers ?? "",
      technologies: parseJson<string[]>(project.technologies, []),
      businessModel: project.businessModel ?? "",
      distribution: project.distribution ?? "",
      award: project.award ?? "",
      awardVerified: project.awardVerified,
    })),
  );

  return { ...result, isDemo: false };
}
