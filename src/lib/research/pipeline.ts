import "server-only";

/**
 * The ProjectScope research pipeline (topic-driven).
 *
 *   A. validate the query
 *   B. search only permitted sources (TinyFish)
 *   C. deduplicate + normalise/classify (OpenAI)
 *   D. persist source references, evidence, uncertainty and timestamps
 *   E. analyse the evidence (Gemini) -> market-gap report with links
 *   F. cluster approaches so the user can compare them
 *
 * Every stage is resilient: a failing source is recorded as a warning and the
 * run continues with whatever did succeed. The number of results we show is
 * always the number we actually found.
 */
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { stringifyJson } from "@/lib/json";
import type { SourceId } from "@/lib/schema";

import { clusterProjects } from "@/lib/providers/openai";
import { generateMarketGapReport, type EvidenceItem } from "@/lib/providers/gemini";

import { emitEvent } from "@/lib/research/events";
import { buildQueryPlan } from "@/lib/research/sources";
import {
  dedupe,
  initialChecks,
  isCancelled,
  normaliseRecords,
  persistRecords,
  runSearches,
  scoreRelevance,
  type CollectionContext,
  type NormalisedRecord,
} from "@/lib/research/collect";
import {
  DEMO_CLUSTERS,
  DEMO_RECORDS,
  DEMO_REPORT,
  DEMO_SOURCE_ID,
} from "@/lib/research/demo";

export interface RunResearchInput {
  jobId: string;
  topic: string;
  problemStatement: string;
  domain: string;
  targetUsers: string;
  geography: string;
  sources: SourceId[];
  resultLimit: number;
  language: string;
  location: string;
  /** True when the run uses the bundled sample dataset instead of live data. */
  isDemo: boolean;
}

const SOURCE_ACCESS_NOTES: Record<string, string> = {
  devpost:
    "Search-result metadata only — Devpost project pages are not retrieved automatically because its Terms of Service prohibit scraping and crawling.",
  unstop:
    "Search plus permitted page retrieval. Unstop's robots.txt rules are respected: no login bypass, no CAPTCHA, no rate-limit evasion.",
  hackernews:
    "Search via the public Hacker News API, linking back to the original thread.",
  web: "General web discovery through the TinyFish Search API.",
};

async function setStage(jobId: string, stage: string, status = "running") {
  await prisma.researchJob.update({ where: { id: jobId }, data: { stage, status } });
}

/* -------------------------------------------------------------------------- */
/* Demo mode runner                                                           */
/* -------------------------------------------------------------------------- */

async function runDemo(context: CollectionContext, input: RunResearchInput) {
  await setStage(input.jobId, "discovering");
  await emitEvent(input.jobId, {
    type: "demo.start",
    stage: "discovering",
    level: "warning",
    message:
      "Demo mode: no provider credentials are configured, so bundled sample records are used. " +
      "These are NOT live research results.",
  });

  const limit = Math.min(input.resultLimit, DEMO_RECORDS.length);
  const records: NormalisedRecord[] = DEMO_RECORDS.slice(0, limit).map((demo) => ({
    ...demo,
    award: "",
    awardVerified: false,
    url: demo.sourceUrl,
    sourceId: DEMO_SOURCE_ID,
    sourceName: "ProjectScope demo dataset",
    siteName: "example.com",
    snippet: demo.summary,
    accessMode: "manual-import" as const,
  }));

  await emitEvent(input.jobId, {
    type: "source.search",
    stage: "discovering",
    level: "success",
    message: `Demo dataset: ${records.length} sample record(s) loaded.`,
    payload: { sourceId: DEMO_SOURCE_ID, returned: records.length },
  });

  await setStage(input.jobId, "storing");
  await persistRecords(
    context,
    records,
    [
      {
        sourceId: DEMO_SOURCE_ID,
        sourceName: "ProjectScope demo dataset",
        status: "ok",
        found: records.length,
        note: "Bundled sample data. No live source was contacted.",
      },
    ],
  );

  await setStage(input.jobId, "analysing");
  await emitEvent(input.jobId, {
    type: "analysis.start",
    stage: "analysing",
    level: "info",
    message: "Demo mode: writing the sample market-gap report.",
  });

  await prisma.marketGapReport.upsert({
    where: { jobId: input.jobId },
    create: {
      jobId: input.jobId,
      summary: DEMO_REPORT.summary,
      gaps: stringifyJson(DEMO_REPORT.gaps),
      patterns: stringifyJson(DEMO_REPORT.patterns),
      competitors: stringifyJson(DEMO_REPORT.competitors),
      assumptions: stringifyJson(DEMO_REPORT.assumptions),
      experiments: stringifyJson(DEMO_REPORT.experiments),
      sources: stringifyJson(DEMO_REPORT.sources),
      isDemo: true,
    },
    update: {
      summary: DEMO_REPORT.summary,
      gaps: stringifyJson(DEMO_REPORT.gaps),
      patterns: stringifyJson(DEMO_REPORT.patterns),
      competitors: stringifyJson(DEMO_REPORT.competitors),
      assumptions: stringifyJson(DEMO_REPORT.assumptions),
      experiments: stringifyJson(DEMO_REPORT.experiments),
      sources: stringifyJson(DEMO_REPORT.sources),
      isDemo: true,
    },
  });

  for (const experiment of DEMO_REPORT.experiments) {
    await prisma.validationExperiment.create({
      data: {
        jobId: input.jobId,
        title: experiment.title,
        hypothesis: experiment.hypothesis,
        method: experiment.method,
        metric: experiment.metric,
        successCriteria: experiment.successCriteria,
        duration: experiment.duration,
        cost: experiment.cost,
        relatedGapId: experiment.relatedGapId,
        isDemo: true,
      },
    });
  }

  await applyClusters(input.jobId, DEMO_CLUSTERS, records.length);

  await setStage(input.jobId, "done", "completed");
  await prisma.researchJob.update({
    where: { id: input.jobId },
    data: { completedAt: new Date(), resultCount: records.length },
  });

  await emitEvent(input.jobId, {
    type: "job.completed",
    stage: "done",
    level: "success",
    message: `Demo research finished: ${records.length} sample record(s).`,
    payload: { resultCount: records.length, isDemo: true },
  });
}

/* -------------------------------------------------------------------------- */
/* Clustering                                                                 */
/* -------------------------------------------------------------------------- */

async function applyClusters(
  jobId: string,
  clusters: Array<{
    clusterId: string;
    memberIndexes: number[];
  }>,
  total: number,
) {
  const results = await prisma.researchResult.findMany({
    where: { jobId },
    orderBy: { rank: "asc" },
    take: total,
  });

  for (const cluster of clusters) {
    for (const index of cluster.memberIndexes) {
      const result = results[index];
      if (!result) continue;
      await prisma.project.update({
        where: { id: result.projectId },
        data: { clusterId: cluster.clusterId },
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main entry point                                                           */
/* -------------------------------------------------------------------------- */

export async function runResearch(input: RunResearchInput): Promise<void> {
  const context: CollectionContext = {
    jobId: input.jobId,
    language: input.language,
    location: input.location,
    isDemo: input.isDemo,
  };

  try {
    if (isDemoMode() || input.isDemo) {
      await runDemo(context, input);
      return;
    }

    await setStage(input.jobId, "discovering");
    await emitEvent(input.jobId, {
      type: "job.started",
      stage: "discovering",
      level: "info",
      message: `Searching ${input.sources.length} permitted source(s) for "${input.topic}".`,
    });

    const plan = buildQueryPlan(input.sources, {
      topic: input.topic,
      problemStatement: input.problemStatement,
      domain: input.domain,
      targetUsers: input.targetUsers,
      geography: input.geography,
    });

    const checks = initialChecks(input.sources, SOURCE_ACCESS_NOTES);
    const discoveries = await runSearches(context, plan, checks);

    if (await isCancelled(input.jobId)) {
      await setStage(input.jobId, "cancelled", "cancelled");
      return;
    }

    const { unique, removed } = dedupe(discoveries);
    await emitEvent(input.jobId, {
      type: "search.dedupe",
      stage: "discovering",
      level: "info",
      message: `${discoveries.length} raw result(s) → ${unique.length} unique URL(s) (${removed} duplicate(s) removed).`,
      payload: { raw: discoveries.length, unique: unique.length, removed },
    });

    if (unique.length === 0) {
      await emitEvent(input.jobId, {
        type: "search.empty",
        stage: "discovering",
        level: "warning",
        message:
          "No results were returned by the sources that were checked. Try a broader query or another source.",
      });
      await setStage(input.jobId, "done", "completed");
      await prisma.researchJob.update({
        where: { id: input.jobId },
        data: { completedAt: new Date(), resultCount: 0, sourcesChecked: stringifyJson([...checks.values()]) },
      });
      return;
    }

    const limited = unique.slice(0, input.resultLimit);

    await setStage(input.jobId, "normalising");
    await emitEvent(input.jobId, {
      type: "normalise.start",
      stage: "normalising",
      level: "info",
      message: `Normalising ${limited.length} record(s) with OpenAI.`,
    });

    const records = await normaliseRecords(context, limited);
    if (await isCancelled(input.jobId)) {
      await setStage(input.jobId, "cancelled", "cancelled");
      return;
    }

    const terms = [input.topic, input.problemStatement, input.domain, input.targetUsers];
    const scored = records
      .map((record) => ({ record, relevance: scoreRelevance(record, terms) }))
      .sort((a, b) => b.relevance - a.relevance);

    await setStage(input.jobId, "storing");
    await persistRecords(context, scored.map((entry) => entry.record), [...checks.values()]);

    const stored = await prisma.researchResult.findMany({
      where: { jobId: input.jobId },
      orderBy: { createdAt: "asc" },
    });
    for (let index = 0; index < stored.length && index < scored.length; index += 1) {
      await prisma.researchResult.update({
        where: { id: stored[index].id },
        data: { rank: index + 1, relevance: scored[index].relevance },
      });
    }

    await emitEvent(input.jobId, {
      type: "store.done",
      stage: "storing",
      level: "success",
      message: `Saved ${scored.length} project record(s) with attribution, source URLs and retrieval timestamps.`,
      payload: { resultCount: scored.length },
    });

    if (await isCancelled(input.jobId)) {
      await setStage(input.jobId, "cancelled", "cancelled");
      return;
    }

    // --- Stage E: Gemini analysis -----------------------------------------
    await setStage(input.jobId, "analysing");
    await emitEvent(input.jobId, {
      type: "analysis.start",
      stage: "analysing",
      level: "info",
      message: "Analysing the collected evidence with Gemini.",
    });

    const evidence: EvidenceItem[] = scored.map(({ record }) => ({
      title: record.title,
      platform: record.platform,
      url: record.url,
      summary: record.summary,
      problemAddressed: record.problemAddressed,
      proposedSolution: record.proposedSolution,
      targetUsers: record.targetUsers,
      technologies: record.technologies,
      sourceName: record.sourceName,
    }));

    try {
      const { report, citations, usedSearchGrounding } = await generateMarketGapReport({
        topic: input.topic,
        problemStatement: input.problemStatement,
        domain: input.domain,
        targetUsers: input.targetUsers,
        geography: input.geography,
        evidence,
        focus: "",
        useSearchGrounding: true,
      });

      const mergedSources = [...report.sources];
      for (const citation of citations) {
        if (!mergedSources.some((source) => source.url === citation.url)) {
          mergedSources.push(citation);
        }
      }

      await prisma.marketGapReport.upsert({
        where: { jobId: input.jobId },
        create: {
          jobId: input.jobId,
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

      for (const experiment of report.experiments) {
        await prisma.validationExperiment.create({
          data: {
            jobId: input.jobId,
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

      await emitEvent(input.jobId, {
        type: "analysis.done",
        stage: "analysing",
        level: "success",
        message: `Report ready: ${report.gaps.length} gap(s), ${report.patterns.length} repeated pattern(s), ${report.sources.length} cited source(s).${
          usedSearchGrounding ? " Search grounding was used." : ""
        }`,
        payload: { gaps: report.gaps.length, sources: report.sources.length },
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError("unknown", String(error));
      await emitEvent(input.jobId, {
        type: "analysis.error",
        stage: "analysing",
        level: "error",
        message: `Analysis failed: ${appError.message}. The collected projects are still available.`,
        payload: { code: appError.code },
      });
    }

    // --- Stage F: clustering ----------------------------------------------
    if (await isCancelled(input.jobId)) {
      await setStage(input.jobId, "cancelled", "cancelled");
      return;
    }

    try {
      const normalisedProjects = scored.map(({ record }) => ({
        title: record.title,
        platform: record.platform,
        summary: record.summary,
        problemAddressed: record.problemAddressed,
        proposedSolution: record.proposedSolution,
        targetUsers: record.targetUsers,
        technologies: record.technologies,
        businessModel: record.businessModel,
        distribution: record.distribution,
        award: record.award,
        awardVerified: record.awardVerified,
        domain: record.domain,
        uncertaintyNotes: record.uncertaintyNotes,
      }));

      const { clusters } = await clusterProjects(normalisedProjects);
      await applyClusters(input.jobId, clusters, normalisedProjects.length);
      await emitEvent(input.jobId, {
        type: "cluster.done",
        stage: "analysing",
        level: "success",
        message: `Grouped the records into ${clusters.length} approach cluster(s).`,
        payload: { clusters: clusters.length },
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError("unknown", String(error));
      await emitEvent(input.jobId, {
        type: "cluster.error",
        stage: "analysing",
        level: "warning",
        message: `Could not cluster the approaches: ${appError.message}`,
        payload: { code: appError.code },
      });
    }

    await setStage(input.jobId, "done", "completed");
    await prisma.researchJob.update({
      where: { id: input.jobId },
      data: { completedAt: new Date() },
    });

    await emitEvent(input.jobId, {
      type: "job.completed",
      stage: "done",
      level: "success",
      message: `Research finished: ${scored.length} project record(s) found.`,
      payload: { resultCount: scored.length },
    });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("unknown", String(error));
    await prisma.researchJob
      .update({
        where: { id: input.jobId },
        data: { status: "failed", stage: "failed", errorMessage: appError.message },
      })
      .catch(() => undefined);
    await emitEvent(input.jobId, {
      type: "job.failed",
      stage: "failed",
      level: "error",
      message: `Research failed: ${appError.message}`,
      payload: { code: appError.code },
    });
  }
}
