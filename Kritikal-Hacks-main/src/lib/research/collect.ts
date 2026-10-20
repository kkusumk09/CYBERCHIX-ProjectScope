import "server-only";

/**
 * Shared collection stage.
 *
 * Both the topic-driven pipeline and the free-choice discovery pipeline need
 * the same three steps — search, normalise, store — so they live here and
 * behave identically. The only difference between the two is the set of
 * queries that is planned.
 */
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { stringifyJson } from "@/lib/json";
import type { SourceCheck, SourceId } from "@/lib/schema";

import { normaliseProjects, type RawDiscovery } from "@/lib/providers/openai";
import { tinyfishSearch } from "@/lib/providers/tinyfish";

import { emitEvent } from "@/lib/research/events";
import { platformForUrl, sourceInfo, type QueryPlan } from "@/lib/research/sources";

/** A discovery hit before normalisation. */
export interface Discovery {
  title: string;
  url: string;
  snippet: string;
  siteName: string;
  publishedDate?: string;
  sourceId: string;
  sourceName: string;
  queryKind: "projects" | "winners" | "open";
  accessMode: "metadata-only" | "fetched" | "manual-import" | "search-grounded";
}

export interface NormalisedRecord {
  title: string;
  platform: string;
  summary: string;
  problemAddressed: string;
  proposedSolution: string;
  targetUsers: string;
  technologies: string[];
  businessModel: string;
  distribution: string;
  award: string;
  awardVerified: boolean;
  domain: string;
  uncertaintyNotes: string[];
  url: string;
  sourceId: string;
  sourceName: string;
  siteName: string;
  snippet: string;
  accessMode: "metadata-only" | "fetched" | "manual-import" | "search-grounded";
}

export interface CollectionContext {
  jobId: string;
  language: string;
  location: string;
  isDemo: boolean;
}

/** True when the user cancelled the run. */
export async function isCancelled(jobId: string): Promise<boolean> {
  const job = await prisma.researchJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  return job?.status === "cancelled";
}

/**
 * Run every planned search and collect the raw hits.
 *
 * A failing source is recorded as a warning; the run continues with whatever
 * did succeed. `checks` ends up describing exactly which sources were
 * contacted and how many records each returned.
 */
export async function runSearches(
  context: CollectionContext,
  plan: QueryPlan[],
  checks: Map<string, SourceCheck>,
): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];

  for (const query of plan) {
    if (await isCancelled(context.jobId)) break;

    const check = checks.get(query.sourceId);
    try {
      const response = await tinyfishSearch({
        query: query.query,
        purpose: query.purpose,
        location: context.location || undefined,
        language: context.language || undefined,
        includeDomains: query.includeDomains.length ? query.includeDomains : undefined,
      });

      for (const result of response.results) {
        discoveries.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          siteName: result.site_name,
          publishedDate: result.date,
          sourceId: query.sourceId,
          sourceName: query.sourceName,
          queryKind: query.kind === "winners" ? "winners" : query.kind === "open" ? "open" : "projects",
          accessMode: sourceInfo(query.sourceId).allowsPageFetch ? "fetched" : "metadata-only",
        });
      }

      await emitEvent(context.jobId, {
        type: "source.search",
        stage: "discovering",
        level: "success",
        message: `${query.sourceName}: ${response.results.length} result(s) for "${query.query}"`,
        payload: {
          sourceId: query.sourceId,
          query: query.query,
          returned: response.results.length,
          totalReported: response.total_results,
        },
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError("unknown", String(error));
      if (check) {
        check.status = "failed";
        check.note = appError.message;
      }
      await emitEvent(context.jobId, {
        type: "source.error",
        stage: "discovering",
        level: "error",
        message: `${query.sourceName} search failed: ${appError.message}`,
        payload: { sourceId: query.sourceId, code: appError.code },
      });
    }
  }

  return discoveries;
}

/** Remove duplicate URLs, keeping the richer snippet. */
export function dedupe(discoveries: Discovery[]): { unique: Discovery[]; removed: number } {
  const seen = new Map<string, Discovery>();
  let removed = 0;

  for (const item of discoveries) {
    const key = normaliseKey(item.url);
    const existing = seen.get(key);
    if (existing) {
      removed += 1;
      if (item.snippet.length > existing.snippet.length) {
        existing.snippet = item.snippet;
        existing.siteName = existing.siteName || item.siteName;
      }
      continue;
    }
    seen.set(key, item);
  }

  return { unique: [...seen.values()], removed };
}

function normaliseKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.hostname.replace(/^www\./, "")}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Normalise the raw hits with OpenAI, in batches so a large result set
 * cannot blow the context window. If a batch fails we keep the raw metadata
 * and mark it as not normalised, rather than losing the record.
 */
export async function normaliseRecords(
  context: CollectionContext,
  discoveries: Discovery[],
): Promise<NormalisedRecord[]> {
  const records: NormalisedRecord[] = [];
  const raw: RawDiscovery[] = discoveries.map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    siteName: item.siteName,
    publishedDate: item.publishedDate,
    sourceId: item.sourceId,
    sourceName: item.sourceName,
  }));

  const BATCH = 20;
  for (let i = 0; i < raw.length; i += BATCH) {
    if (await isCancelled(context.jobId)) break;
    const batch = raw.slice(i, i + BATCH);
    try {
      const result = await normaliseProjects(batch);
      result.projects.forEach((project, index) => {
        const source = batch[index];
        if (!source) return;
        records.push({
          ...project,
          url: source.url,
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          siteName: source.siteName,
          snippet: source.snippet,
          accessMode: sourceInfo(source.sourceId).allowsPageFetch ? "fetched" : "metadata-only",
        });
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError("unknown", String(error));
      await emitEvent(context.jobId, {
        type: "normalise.error",
        stage: "normalising",
        level: "warning",
        message: `Could not normalise a batch of results: ${appError.message}`,
        payload: { code: appError.code },
      });

      for (const source of batch) {
        records.push({
          title: source.title,
          platform: platformForUrl(source.url),
          summary: source.snippet,
          problemAddressed: "",
          proposedSolution: "",
          targetUsers: "",
          technologies: [],
          businessModel: "",
          distribution: "",
          award: "",
          awardVerified: false,
          domain: "",
          uncertaintyNotes: ["Not normalised by the model — raw search metadata only."],
          url: source.url,
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          siteName: source.siteName,
          snippet: source.snippet,
          accessMode: sourceInfo(source.sourceId).allowsPageFetch ? "fetched" : "metadata-only",
        });
      }
    }
  }

  return records;
}

/**
 * Persist the records with their source references, uncertainty notes and
 * retrieval timestamps. `checks` is updated with the real per-source counts.
 */
export async function persistRecords(
  context: CollectionContext,
  records: NormalisedRecord[],
  checks: SourceCheck[],
): Promise<void> {
  const foundBySource = new Map<string, number>();
  for (const record of records) {
    foundBySource.set(record.sourceId, (foundBySource.get(record.sourceId) ?? 0) + 1);
  }
  for (const check of checks) {
    check.found = foundBySource.get(check.sourceId) ?? 0;
    if (check.status === "ok" && check.found === 0) {
      check.status = "partial";
      check.note = `${check.note} No matching results were returned for this source.`;
    }
  }

  for (const record of records) {
    const source = sourceInfo(record.sourceId);
    const attribution = `${record.sourceName} — "${record.title}"`;

    const project = await prisma.project.create({
      data: {
        title: record.title,
        platform: record.platform || platformForUrl(record.url),
        sourceId: record.sourceId,
        sourceUrl: record.url,
        attribution,
        summary: record.summary,
        problemAddressed: record.problemAddressed,
        proposedSolution: record.proposedSolution,
        targetUsers: record.targetUsers,
        technologies: stringifyJson(record.technologies),
        businessModel: record.businessModel,
        distribution: record.distribution,
        award: record.award || null,
        awardVerified: Boolean(record.awardVerified && record.award),
        ranking: null,
        domain: record.domain,
        uncertaintyNotes: stringifyJson(record.uncertaintyNotes),
        discoveryMetadata: stringifyJson([
          {
            sourceId: record.sourceId,
            sourceName: record.sourceName,
            siteName: record.siteName,
            snippet: record.snippet,
            accessMode: record.accessMode,
            retrievedAt: new Date().toISOString(),
          },
        ]),
        retrievedAt: new Date(),
      },
    });

    await prisma.researchResult.create({
      data: {
        jobId: context.jobId,
        projectId: project.id,
        relevance: 0,
        rank: 0,
        discoveryNote: record.accessMode,
        isDemo: context.isDemo,
      },
    });

    await prisma.sourceReference.create({
      data: {
        jobId: context.jobId,
        sourceId: record.sourceId,
        sourceName: source.name,
        url: record.url,
        title: record.title,
        attribution,
        accessMode: record.accessMode,
        snippet: record.snippet,
        retrievedAt: new Date(),
      },
    });
  }

  await prisma.researchJob.update({
    where: { id: context.jobId },
    data: {
      resultCount: records.length,
      sourcesChecked: stringifyJson(checks),
    },
  });
}

/**
 * A small, explainable relevance score. We deliberately do NOT ask a model
 * for a number here: the score is a simple overlap between the query terms
 * and the record text, which the UI can explain.
 */
export function scoreRelevance(
  record: Pick<
    NormalisedRecord,
    "title" | "summary" | "problemAddressed" | "proposedSolution" | "targetUsers" | "technologies"
  >,
  terms: string[],
): number {
  const cleaned = terms
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  const unique = new Set(cleaned);
  if (unique.size === 0) return 0.5;

  const haystack = [
    record.title,
    record.summary,
    record.problemAddressed,
    record.proposedSolution,
    record.targetUsers,
    record.technologies.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const term of unique) {
    if (haystack.includes(term)) hits += 1;
  }
  return Math.min(1, hits / unique.size);
}

/** Build the per-source status rows for a set of selected sources. */
export function initialChecks(
  sourceIds: SourceId[],
  access: Record<string, string>,
): Map<string, SourceCheck> {
  const checks = new Map<string, SourceCheck>();
  for (const sourceId of sourceIds) {
    const source = sourceInfo(sourceId);
    checks.set(sourceId, {
      sourceId,
      sourceName: source.name,
      status: "ok",
      found: 0,
      note: access[sourceId] ?? source.policyNote,
    });
  }
  return checks;
}
