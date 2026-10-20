import "server-only";

/**
 * Gemini provider.
 *
 * Synthesises the collected evidence into a market-gap report: overlooked
 * segments, unresolved needs, accessibility/affordability barriers, adoption
 * barriers, trust, distribution and monetisation opportunities.
 *
 * Uses the official `@google/genai` SDK, the Interactions API, structured
 * output (`response_format`) and — when the selected model supports it — the
 * `google_search` grounding tool so factual claims can carry inline
 * citations.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/grounding
 */
import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

import { AppError, redactSecrets } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { zodToJsonSchema } from "@/lib/ai-json";
import { geminiDiscoveryAnalysisSchema, geminiReportSchema } from "@/lib/ai-schemas";
import type { MarketGapReport, SourceLink } from "@/lib/schema";

const PROVIDER = "gemini";

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (client) return client;
  const env = getEnv();
  if (!env.GEMINI_API_KEY) {
    throw new AppError("invalid_key", "Gemini API key is not configured.", { provider: PROVIDER });
  }
  client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

function mapError(error: unknown): AppError {
  const env = getEnv();
  const secrets = [env.GEMINI_API_KEY];
  const message = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number } | undefined)?.status;

  if (status === 400 && /API key not valid/i.test(message)) {
    return new AppError("invalid_key", "Gemini rejected the API key.", { provider: PROVIDER });
  }
  if (status === 401 || status === 403) {
    return new AppError("invalid_key", "Gemini rejected the API key.", { provider: PROVIDER });
  }
  if (status === 429) {
    if (/quota|billing|exceeded your current quota/i.test(message)) {
      return new AppError("quota_exceeded", "The Gemini account has no remaining quota.", {
        provider: PROVIDER,
      });
    }
    return new AppError("rate_limited", "Gemini rate limit reached. Try again shortly.", {
      provider: PROVIDER,
    });
  }
  if (status === 404) {
    return new AppError(
      "malformed_response",
      `Gemini does not know the configured model "${env.GEMINI_MODEL}". Update GEMINI_MODEL.`,
      { provider: PROVIDER },
    );
  }
  if (/timeout|deadline exceeded/i.test(message)) {
    return new AppError("timeout", "The Gemini request timed out.", { provider: PROVIDER });
  }

  return new AppError("unknown", redactSecrets(message, secrets), { provider: PROVIDER });
}

const REPORT_SYSTEM = `You are a market-intelligence analyst for hackathon teams.

You receive REAL evidence: short factual summaries, metadata and source URLs of public project records, plus the user's stated topic, problem and constraints.

Your job is to find what the existing work does NOT cover.

Absolute rules:
- Separate evidence from hypothesis. Every gap must state whether it is backed by the supplied evidence (claimType "evidence") or is your reasoning (claimType "hypothesis"). Never present a hypothesis as a fact.
- Never invent market statistics, customer interviews, awards, rankings, citations or competitor features. If the evidence does not contain a number, there is no number in your report.
- "supportingEvidence" must quote or closely paraphrase the supplied evidence. "sourceUrls" must only contain URLs that were supplied to you.
- "confidence" reflects how well the supplied evidence supports the gap: "low", "medium" or "high".
- "assumptions" lists what you had to assume to make the observation, and "howToValidate" style experiments must be things a student team can run in days, not enterprise research.
- "affectedUsers" describes who is underserved, in plain language.
- "proposedImprovement" and "potentialBusinessValue" must stay grounded in the evidence; keep business value qualitative unless the evidence supports a number.
- "coverageNote" must state plainly how many records you actually saw and which sources they came from. Never claim comprehensive coverage.
- If the evidence is thin, say so in the summary and produce fewer, lower-confidence gaps rather than padding the list.`;

export interface EvidenceItem {
  title: string;
  platform: string;
  url: string;
  summary: string;
  problemAddressed: string;
  proposedSolution: string;
  targetUsers: string;
  technologies: string[];
  sourceName: string;
}

export interface ReportContext {
  topic: string;
  problemStatement: string;
  domain: string;
  targetUsers: string;
  geography: string;
  evidence: EvidenceItem[];
  focus: string;
  /** Allow the model to run its own web search to fill in permitted context. */
  useSearchGrounding: boolean;
}

export interface ReportResult {
  report: MarketGapReport;
  /** Citations Gemini attached to its answer (from search grounding). */
  citations: SourceLink[];
  /** True when the report was produced with live search grounding. */
  usedSearchGrounding: boolean;
}

/** Pull `url_citation` annotations out of the interaction steps. */
function extractCitations(steps: unknown): SourceLink[] {
  if (!Array.isArray(steps)) return [];
  const links: SourceLink[] = [];
  const seen = new Set<string>();

  for (const step of steps) {
    if (typeof step !== "object" || step === null) continue;
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (typeof block !== "object" || block === null) continue;
      const annotations = (block as { annotations?: unknown }).annotations;
      if (!Array.isArray(annotations)) continue;

      for (const annotation of annotations) {
        if (typeof annotation !== "object" || annotation === null) continue;
        const type = (annotation as { type?: string }).type;
        if (type !== "url_citation") continue;
        const url = (annotation as { url?: string }).url ?? "";
        if (!url || seen.has(url)) continue;
        seen.add(url);
        links.push({
          url,
          title: (annotation as { title?: string }).title ?? "",
          source: new URL(url).hostname.replace(/^www\./, ""),
        });
      }
    }
  }

  return links;
}

function buildInput(context: ReportContext): string {
  const evidence = context.evidence.map((item, index) => ({
    index,
    title: item.title,
    platform: item.platform,
    url: item.url,
    source: item.sourceName,
    summary: item.summary,
    problemAddressed: item.problemAddressed,
    proposedSolution: item.proposedSolution,
    targetUsers: item.targetUsers,
    technologies: item.technologies,
  }));

  return `Topic: ${context.topic}
Problem statement: ${context.problemStatement || "(not supplied)"}
Domain: ${context.domain || "(not supplied)"}
Target users: ${context.targetUsers || "(not supplied)"}
Geography: ${context.geography || "(not supplied)"}
${context.focus ? `Extra focus from the user: ${context.focus}\n` : ""}
Evidence records (${evidence.length} total, retrieved from the sources listed below):
${JSON.stringify(evidence, null, 2)}

Produce the market-gap report. Only the URLs above may appear in sourceUrls.`;
}

export async function generateMarketGapReport(context: ReportContext): Promise<ReportResult> {
  const api = getClient();
  const env = getEnv();
  const schema = zodToJsonSchema(geminiReportSchema);

  const baseParams = {
    model: env.GEMINI_MODEL,
    input: buildInput(context),
    system_instruction: REPORT_SYSTEM,
    response_format: {
      type: "text" as const,
      mime_type: "application/json" as const,
      schema,
    },
    // Do not persist the interaction on Google's servers.
    store: false,
  };

  let interaction: Awaited<ReturnType<typeof api.interactions.create>>;
  let usedSearchGrounding = false;

  if (context.useSearchGrounding) {
    try {
      interaction = await api.interactions.create({
        ...baseParams,
        tools: [{ type: "google_search" }],
      });
      usedSearchGrounding = true;
    } catch (error) {
      // Grounding is a nice-to-have. If the model or account cannot use it,
      // fall back to analysing only the evidence we already collected.
      const mapped = mapError(error);
      if (mapped.code === "invalid_key" || mapped.code === "quota_exceeded") throw mapped;
      try {
        interaction = await api.interactions.create(baseParams);
      } catch (fallbackError) {
        throw mapError(fallbackError);
      }
    }
  } else {
    try {
      interaction = await api.interactions.create(baseParams);
    } catch (error) {
      throw mapError(error);
    }
  }

  const text = interaction.output_text ?? "";
  if (!text) {
    throw new AppError("malformed_response", "Gemini returned no text output.", {
      provider: PROVIDER,
    });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new AppError("malformed_response", "Gemini returned output that was not valid JSON.", {
      provider: PROVIDER,
    });
  }

  const validated = geminiReportSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new AppError("malformed_response", "Gemini's report did not match the expected shape.", {
      provider: PROVIDER,
      details: validated.error.issues
        .slice(0, 8)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    });
  }

  const citations = extractCitations(interaction.steps);

  return {
    report: validated.data as MarketGapReport,
    citations,
    usedSearchGrounding,
  };
}

/** Only used by tests — clears the memoised client. */
export function resetGeminiClient(): void {
  client = undefined;
}

/* -------------------------------------------------------------------------- */
/* Free-choice mode: analyse successful projects                              */
/* -------------------------------------------------------------------------- */

const DISCOVERY_SYSTEM = `You are a hackathon strategist who looks at what has already been built and works out what is worth building next.

You receive REAL evidence: short factual summaries, metadata and source URLs of public project records from hackathon platforms.

Your job has four parts.

1. RECURRING PATTERNS — what the successful projects keep doing the same way. Only report a pattern when at least two records support it, and list those records.

2. WEAKNESSES — where the existing work is weak. A weakness must be visible in the supplied records. Do not invent a weakness the records do not show. If a record shows no weakness, do not claim one.

3. UNDERSERVED USERS — who the existing work consistently does not serve. Base this on the target users that appear (or do not appear) in the records, and say how many records support it.

4. CANDIDATE PROBLEMS — real-world problems that look promising to attack, chosen by you. The user did not name a problem, so you are proposing it. For each problem state the affected users, why it looks timely now, and which supplied URLs evidence it. Do not invent statistics, interviews, awards or competitor features. If you use your own web search to add context, keep the claim modest and attach the URL you got it from.

Absolute rules:
- Separate evidence from reasoning. If a statement is your inference rather than something the records state, make that clear in the wording.
- "sourceUrls" and "evidenceUrls" may only contain URLs that were supplied to you, plus URLs returned by your own search grounding.
- "coverageNote" must state plainly how many records you saw and which sources they came from. Never claim comprehensive coverage.
- If the evidence is thin, say so and produce fewer, lower-confidence candidate problems rather than padding the list.`;

export interface DiscoveryAnalysisResult {
  analysis: z.infer<typeof geminiDiscoveryAnalysisSchema>;
  citations: SourceLink[];
  usedSearchGrounding: boolean;
}

export async function analyseDiscovery(input: {
  evidence: EvidenceItem[];
  focus: string;
  useSearchGrounding: boolean;
}): Promise<DiscoveryAnalysisResult> {
  const api = getClient();
  const env = getEnv();
  const schema = zodToJsonSchema(geminiDiscoveryAnalysisSchema);

  const evidence = input.evidence.map((item, index) => ({
    index,
    title: item.title,
    platform: item.platform,
    url: item.url,
    source: item.sourceName,
    summary: item.summary,
    problemAddressed: item.problemAddressed,
    proposedSolution: item.proposedSolution,
    targetUsers: item.targetUsers,
    technologies: item.technologies,
  }));

  const baseParams = {
    model: env.GEMINI_MODEL,
    input: `Project records analysed (${evidence.length} total):\n${JSON.stringify(evidence, null, 2)}\n\n${
      input.focus ? `Extra focus: ${input.focus}\n` : ""
    }Report the patterns, weaknesses, underserved users and candidate problems.`,
    system_instruction: DISCOVERY_SYSTEM,
    response_format: {
      type: "text" as const,
      mime_type: "application/json" as const,
      schema,
    },
    store: false,
  };

  let interaction: Awaited<ReturnType<typeof api.interactions.create>>;
  let usedSearchGrounding = false;

  if (input.useSearchGrounding) {
    try {
      interaction = await api.interactions.create({
        ...baseParams,
        tools: [{ type: "google_search" }],
      });
      usedSearchGrounding = true;
    } catch (error) {
      const mapped = mapError(error);
      if (mapped.code === "invalid_key" || mapped.code === "quota_exceeded") throw mapped;
      try {
        interaction = await api.interactions.create(baseParams);
      } catch (fallbackError) {
        throw mapError(fallbackError);
      }
    }
  } else {
    try {
      interaction = await api.interactions.create(baseParams);
    } catch (error) {
      throw mapError(error);
    }
  }

  const text = interaction.output_text ?? "";
  if (!text) {
    throw new AppError("malformed_response", "Gemini returned no text output.", {
      provider: PROVIDER,
    });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new AppError("malformed_response", "Gemini returned output that was not valid JSON.", {
      provider: PROVIDER,
    });
  }

  const validated = geminiDiscoveryAnalysisSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new AppError(
      "malformed_response",
      "Gemini's discovery analysis did not match the expected shape.",
      {
        provider: PROVIDER,
        details: validated.error.issues
          .slice(0, 8)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      },
    );
  }

  return {
    analysis: validated.data,
    citations: extractCitations(interaction.steps),
    usedSearchGrounding,
  };
}
