import "server-only";

/**
 * Free-choice discovery pipeline.
 *
 * The user did NOT name a problem. ProjectScope therefore:
 *
 *   1. researches permitted sources with open-ended queries (winners, existing
 *      projects, emerging technology, real-world problems),
 *   2. analyses the successful projects for recurring patterns, weaknesses,
 *      underserved users and opportunities (Gemini),
 *   3. identifies promising problems itself,
 *   4. designs five concepts across different domains, scores them on
 *      feasibility, originality, impact, ambition and demo potential (OpenAI),
 *   5. recommends the strongest one with its evidence and caveats,
 *   6. writes a complete project proposal for the selected concept.
 *
 * The user's interests, technologies, team capabilities and constraints are
 * optional preferences — the flow works with all of them blank.
 */
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { parseJson, stringifyJson } from "@/lib/json";
import type { SourceId } from "@/lib/schema";

import { buildProposal, generateDiscoveryConcepts } from "@/lib/providers/openai";
import { analyseDiscovery, type EvidenceItem } from "@/lib/providers/gemini";

import { emitEvent } from "@/lib/research/events";
import { SOURCE_REGISTRY, type QueryPlan } from "@/lib/research/sources";
import {
  dedupe,
  initialChecks,
  isCancelled,
  normaliseRecords,
  persistRecords,
  runSearches,
  type CollectionContext,
} from "@/lib/research/collect";
import {
  DEMO_DISCOVERY_ANALYSIS,
  DEMO_DISCOVERY_COMMON_GROUND,
  DEMO_DISCOVERY_CONCEPTS,
  DEMO_DISCOVERY_RECOMMENDATION,
  DEMO_DISCOVERY_UNVALIDATED,
  DEMO_PROPOSAL,
  DEMO_RECORDS,
} from "@/lib/research/demo";

export interface DiscoveryInput {
  discoveryId: string;
  jobId: string;
  interests: string;
  techPreferences: string;
  teamCapabilities: string;
  constraints: string;
  sources: SourceId[];
  resultLimit: number;
  conceptCount: number;
  language: string;
  location: string;
  isDemo: boolean;
}

const SOURCE_ACCESS_NOTES: Record<string, string> = {
  devpost:
    "Search-result metadata only — Devpost project pages are not retrieved automatically because its Terms of Service prohibit scraping and crawling.",
  unstop:
    "Search plus permitted page retrieval. Unstop's robots.txt rules are respected: no login bypass, no CAPTCHA, no rate-limit evasion.",
  hackernews: "Search via the public Hacker News API, linking back to the original thread.",
  web: "General web discovery through the TinyFish Search API.",
};

/**
 * The open-ended queries used when the user has not named a problem.
 *
 * They deliberately cover the four things a free-choice run needs to see:
 * past winners, existing projects, emerging technology and real-world
 * problems.
 */
export function buildDiscoveryQueryPlan(sourceIds: SourceId[]): QueryPlan[] {
  const plan: QueryPlan[] = [];

  for (const sourceId of sourceIds) {
    const source = SOURCE_REGISTRY[sourceId];

    plan.push({
      sourceId,
      sourceName: source.name,
      query: "hackathon award winning project winner first place",
      purpose: "Find past hackathon winners and awarded projects, to learn what winning work looks like.",
      includeDomains: source.includeDomains,
      kind: "winners",
    });

    plan.push({
      sourceId,
      sourceName: source.name,
      query: "hackathon project solves real world problem solution build",
      purpose: "Find existing hackathon projects and the real-world problems they attack.",
      includeDomains: source.includeDomains,
      kind: "projects",
    });
  }

  if (sourceIds.includes("web")) {
    plan.push({
      sourceId: "web",
      sourceName: SOURCE_REGISTRY.web.name,
      query: "hackathon project emerging technology trend prototype",
      purpose: "Find which emerging technologies hackathon teams are currently building with.",
      includeDomains: [],
      kind: "open",
    });

    plan.push({
      sourceId: "web",
      sourceName: SOURCE_REGISTRY.web.name,
      query: "hackathon project accessibility underserved users inclusion",
      purpose: "Find hackathon projects aimed at users the field tends to overlook.",
      includeDomains: [],
      kind: "open",
    });
  }

  return plan;
}

async function setStage(discoveryId: string, stage: string, status = "running") {
  await prisma.ideaDiscovery.update({
    where: { id: discoveryId },
    data: { stage, status },
  });
}

/* -------------------------------------------------------------------------- */
/* Demo path                                                                  */
/* -------------------------------------------------------------------------- */

async function runDemo(context: CollectionContext, input: DiscoveryInput) {
  await setStage(input.discoveryId, "discovering");
  await emitEvent(input.jobId, {
    type: "demo.start",
    stage: "discovering",
    level: "warning",
    message:
      "Demo mode: no provider credentials are configured, so the bundled sample dataset is used. " +
      "These are NOT live research results.",
  });

  const limit = Math.min(input.resultLimit, DEMO_RECORDS.length);
  const records = DEMO_RECORDS.slice(0, limit).map((demo) => ({
    ...demo,
    award: "",
    awardVerified: false,
    url: demo.sourceUrl,
    sourceId: "demo",
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
    payload: { returned: records.length },
  });

  await setStage(input.discoveryId, "storing");
  await persistRecords(context, records, [
    {
      sourceId: "demo",
      sourceName: "ProjectScope demo dataset",
      status: "ok",
      found: records.length,
      note: "Bundled sample data. No live source was contacted.",
    },
  ]);

  await setStage(input.discoveryId, "analysing");
  await emitEvent(input.jobId, {
    type: "analysis.start",
    stage: "analysing",
    level: "info",
    message: "Demo mode: analysing the sample records for patterns, weaknesses and gaps.",
  });

  const concepts = DEMO_DISCOVERY_CONCEPTS.slice(0, input.conceptCount);
  const recommendation =
    concepts.find((concept) => concept.id === DEMO_DISCOVERY_RECOMMENDATION.conceptId) ?? concepts[0];

  await prisma.ideaDiscovery.update({
    where: { id: input.discoveryId },
    data: {
      analysis: stringifyJson({
        ...DEMO_DISCOVERY_ANALYSIS,
        commonGround: DEMO_DISCOVERY_COMMON_GROUND,
        unvalidated: DEMO_DISCOVERY_UNVALIDATED,
      }),
      concepts: stringifyJson(concepts),
      recommendation: stringifyJson({
        ...DEMO_DISCOVERY_RECOMMENDATION,
        conceptId: recommendation.id,
      }),
    },
  });

  await setStage(input.discoveryId, "designing");
  await emitEvent(input.jobId, {
    type: "concepts.done",
    stage: "designing",
    level: "success",
    message: `Designed ${concepts.length} demo concept(s) across ${concepts.length} domain(s).`,
    payload: { concepts: concepts.length },
  });

  await setStage(input.discoveryId, "done", "completed");
  await prisma.researchJob.update({
    where: { id: input.jobId },
    data: { completedAt: new Date(), resultCount: records.length },
  });

  await emitEvent(input.jobId, {
    type: "job.completed",
    stage: "done",
    level: "success",
    message: `Free-choice discovery finished: ${concepts.length} concept(s) from ${records.length} sample record(s).`,
    payload: { resultCount: records.length, isDemo: true },
  });
}

/* -------------------------------------------------------------------------- */
/* Live path                                                                  */
/* -------------------------------------------------------------------------- */

export async function runDiscovery(input: DiscoveryInput): Promise<void> {
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

    // --- Stage 1: open-ended discovery -----------------------------------
    await setStage(input.discoveryId, "discovering");
    await emitEvent(input.jobId, {
      type: "job.started",
      stage: "discovering",
      level: "info",
      message:
        "No problem was given, so ProjectScope is researching past winners, existing projects, emerging technology and real-world problems.",
    });

    const plan = buildDiscoveryQueryPlan(input.sources);
    const checks = initialChecks(input.sources, SOURCE_ACCESS_NOTES);
    const discoveries = await runSearches(context, plan, checks);

    if (await isCancelled(input.jobId)) {
      await setStage(input.discoveryId, "cancelled", "cancelled");
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
          "No results were returned by the sources that were checked, so no problem could be identified. Try another source or a live run.",
      });
      await setStage(input.discoveryId, "done", "completed");
      await prisma.researchJob.update({
        where: { id: input.jobId },
        data: {
          completedAt: new Date(),
          resultCount: 0,
          sourcesChecked: stringifyJson([...checks.values()]),
        },
      });
      return;
    }

    const limited = unique.slice(0, input.resultLimit);

    await setStage(input.discoveryId, "normalising");
    const records = await normaliseRecords(context, limited);

    await setStage(input.discoveryId, "storing");
    await persistRecords(context, records, [...checks.values()]);
    await emitEvent(input.jobId, {
      type: "store.done",
      stage: "storing",
      level: "success",
      message: `Saved ${records.length} project record(s) with attribution, source URLs and retrieval timestamps.`,
      payload: { resultCount: records.length },
    });

    // --- Stage 2: analyse what has been built ----------------------------
    await setStage(input.discoveryId, "analysing");
    await emitEvent(input.jobId, {
      type: "analysis.start",
      stage: "analysing",
      level: "info",
      message: "Looking for recurring patterns, weaknesses, underserved users and candidate problems.",
    });

    const evidence: EvidenceItem[] = records.map((record) => ({
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

    const { analysis, citations } = await analyseDiscovery({
      evidence,
      focus: [input.interests, input.techPreferences, input.constraints]
        .filter(Boolean)
        .join(". "),
      useSearchGrounding: true,
    });

    const mergedSources = [...analysis.sources];
    for (const citation of citations) {
      if (!mergedSources.some((source) => source.url === citation.url)) {
        mergedSources.push(citation);
      }
    }

    await prisma.ideaDiscovery.update({
      where: { id: input.discoveryId },
      data: { analysis: stringifyJson({ ...analysis, sources: mergedSources }) },
    });

    await emitEvent(input.jobId, {
      type: "analysis.done",
      stage: "analysing",
      level: "success",
      message: `Found ${analysis.recurringPatterns.length} recurring pattern(s), ${analysis.weaknesses.length} weakness(es) and ${analysis.candidateProblems.length} candidate problem(s).`,
      payload: {
        patterns: analysis.recurringPatterns.length,
        problems: analysis.candidateProblems.length,
      },
    });

    if (await isCancelled(input.jobId)) {
      await setStage(input.discoveryId, "cancelled", "cancelled");
      return;
    }

    // --- Stage 3: design, score and rank the concepts ---------------------
    await setStage(input.discoveryId, "designing");
    await emitEvent(input.jobId, {
      type: "concepts.start",
      stage: "designing",
      level: "info",
      message: `Designing ${input.conceptCount} concepts across different domains and scoring them.`,
    });

    const result = await generateDiscoveryConcepts({
      interests: input.interests,
      techPreferences: input.techPreferences,
      teamCapabilities: input.teamCapabilities,
      constraints: input.constraints,
      count: input.conceptCount,
      analysis: {
        summary: analysis.summary,
        recurringPatterns: analysis.recurringPatterns,
        weaknesses: analysis.weaknesses,
        underservedUsers: analysis.underservedUsers,
        opportunities: analysis.opportunities,
        candidateProblems: analysis.candidateProblems,
      },
      existingProjects: records.slice(0, 30).map((record) => ({
        title: record.title,
        platform: record.platform,
        url: record.url,
        summary: record.summary,
        problemAddressed: record.problemAddressed,
        proposedSolution: record.proposedSolution,
        targetUsers: record.targetUsers,
        technologies: record.technologies,
      })),
    });

    const ranked = [...result.concepts].sort((a, b) => b.totalScore - a.totalScore);
    const best = ranked.find((concept) => concept.id === result.recommendedId) ?? ranked[0];

    await prisma.ideaDiscovery.update({
      where: { id: input.discoveryId },
      data: {
        concepts: stringifyJson(ranked),
        recommendation: stringifyJson({ ...result.recommendation, conceptId: best?.id ?? "" }),
      },
    });

    await emitEvent(input.jobId, {
      type: "concepts.done",
      stage: "designing",
      level: "success",
      message: `Designed ${ranked.length} concept(s). Recommended: ${best?.title ?? "none"}.`,
      payload: { concepts: ranked.length, recommended: best?.id },
    });

    await setStage(input.discoveryId, "done", "completed");
    await prisma.researchJob.update({
      where: { id: input.jobId },
      data: { completedAt: new Date() },
    });

    await emitEvent(input.jobId, {
      type: "job.completed",
      stage: "done",
      level: "success",
      message: `Free-choice discovery finished: ${ranked.length} ranked concept(s) from ${records.length} record(s).`,
      payload: { resultCount: records.length },
    });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError("unknown", String(error));
    await prisma.ideaDiscovery
      .update({
        where: { id: input.discoveryId },
        data: { status: "failed", stage: "failed", errorMessage: appError.message },
      })
      .catch(() => undefined);
    await emitEvent(input.jobId, {
      type: "job.failed",
      stage: "failed",
      level: "error",
      message: `Free-choice discovery failed: ${appError.message}`,
      payload: { code: appError.code },
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Proposal                                                                   */
/* -------------------------------------------------------------------------- */

export async function buildProposalForConcept(
  discoveryId: string,
  conceptId: string,
  userNotes: string,
): Promise<{ id: string; title: string; content: unknown; isDemo: boolean }> {
  const discovery = await prisma.ideaDiscovery.findUnique({
    where: { id: discoveryId },
    include: { job: { include: { results: { orderBy: { rank: "asc" }, include: { project: true } } } } },
  });

  if (!discovery) {
    throw new AppError("not_found", "That discovery run does not exist.");
  }

  const concepts = parseJson<Array<{ id: string }>>(discovery.concepts, []);
  const concept = concepts.find((item) => item.id === conceptId) ?? concepts[0];
  if (!concept) {
    throw new AppError("validation_error", "Generate concepts first, then build a proposal.");
  }

  const analysis = parseJson(discovery.analysis, {} as Record<string, unknown>);
  const existingProjects = discovery.job.results.map((result) => ({
    title: result.project.title,
    platform: result.project.platform,
    url: result.project.sourceUrl,
    summary: result.project.summary,
    problemAddressed: result.project.problemAddressed ?? "",
    proposedSolution: result.project.proposedSolution ?? "",
    targetUsers: result.project.targetUsers ?? "",
    technologies: parseJson<string[]>(result.project.technologies, []),
  }));

  if (isDemoMode() || discovery.isDemo) {
    const proposal = await prisma.proposal.create({
      data: {
        discoveryId,
        conceptId: concept.id,
        title: DEMO_PROPOSAL.title,
        content: stringifyJson(DEMO_PROPOSAL),
        isDemo: true,
      },
    });
    return {
      id: proposal.id,
      title: proposal.title,
      content: DEMO_PROPOSAL,
      isDemo: true,
    };
  }

  const content = await buildProposal({
    concept: concept as Parameters<typeof buildProposal>[0]["concept"],
    analysis: analysis as Parameters<typeof buildProposal>[0]["analysis"],
    existingProjects,
    userNotes,
    interests: discovery.interests,
    techPreferences: discovery.techPreferences,
    teamCapabilities: discovery.teamCapabilities,
    constraints: discovery.constraints,
  });

  const proposal = await prisma.proposal.create({
    data: {
      discoveryId,
      conceptId: concept.id,
      title: content.title,
      content: stringifyJson(content),
      isDemo: false,
    },
  });

  return { id: proposal.id, title: proposal.title, content, isDemo: false };
}
