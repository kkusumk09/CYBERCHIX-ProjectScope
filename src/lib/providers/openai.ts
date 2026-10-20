import "server-only";

/**
 * OpenAI provider.
 *
 * Responsibilities:
 *  - normalise + classify raw discovery records into a consistent project shape
 *  - cluster projects by approach
 *  - generate and compare differentiated concepts against collected evidence
 *  - review pitch clarity
 *
 * Uses the official `openai` SDK, the Responses API and structured outputs
 * (`zodTextFormat`). Docs: https://platform.openai.com/docs/guides/structured-outputs
 */
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import type { z } from "zod";

import { AppError, redactSecrets } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import {
  openAiClusterSchema,
  openAiComparisonSchema,
  openAiConceptsSchema,
  openAiDiscoverySchema,
  openAiNormaliseSchema,
  openAiPitchSchema,
  openAiProposalSchema,
} from "@/lib/ai-schemas";
import type {
  NormalisedProjects,
  ClusteredProjects,
  Concepts,
  PitchReview,
} from "@/lib/schema";

const PROVIDER = "openai";

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (client) return client;
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new AppError("invalid_key", "OpenAI API key is not configured.", { provider: PROVIDER });
  }
  client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: env.PROVIDER_TIMEOUT_MS,
    maxRetries: 2,
  });
  return client;
}

function mapError(error: unknown): AppError {
  const env = getEnv();
  const secrets = [env.OPENAI_API_KEY];

  if (error instanceof APIUserAbortError) {
    return new AppError("cancelled", "The OpenAI request was cancelled.", { provider: PROVIDER });
  }
  if (error instanceof APIConnectionTimeoutError) {
    return new AppError("timeout", "The OpenAI request timed out.", { provider: PROVIDER });
  }
  if (error instanceof AuthenticationError) {
    return new AppError("invalid_key", "OpenAI rejected the API key.", { provider: PROVIDER });
  }
  if (error instanceof PermissionDeniedError) {
    return new AppError("invalid_key", "OpenAI rejected the API key or the project is not permitted.", {
      provider: PROVIDER,
    });
  }
  if (error instanceof RateLimitError) {
    const message = error.message.toLowerCase();
    if (
      message.includes("insufficient_quota") ||
      message.includes("billing") ||
      message.includes("exceeded your current quota") ||
      message.includes("exceeded your quota")
    ) {
      return new AppError("quota_exceeded", "The OpenAI account has no remaining quota.", {
        provider: PROVIDER,
      });
    }
    return new AppError("rate_limited", "OpenAI rate limit reached. Try again shortly.", {
      provider: PROVIDER,
    });
  }
  if (error instanceof APIError) {
    if (error.status === 401) {
      return new AppError("invalid_key", "OpenAI rejected the API key.", { provider: PROVIDER });
    }
    if (error.status === 429) {
      const message = error.message.toLowerCase();
      if (
        message.includes("insufficient_quota") ||
        message.includes("billing") ||
        message.includes("exceeded your current quota") ||
        message.includes("exceeded your quota")
      ) {
        return new AppError("quota_exceeded", "The OpenAI account has no remaining quota.", {
          provider: PROVIDER,
        });
      }
      return new AppError("rate_limited", "OpenAI rate limit reached. Try again shortly.", {
        provider: PROVIDER,
      });
    }
    if (error.status === 400 && error.message.includes("model")) {
      return new AppError(
        "malformed_response",
        `OpenAI does not accept the configured model "${env.OPENAI_MODEL}". Update OPENAI_MODEL.`,
        { provider: PROVIDER },
      );
    }
    return new AppError(
      "unknown",
      redactSecrets(`OpenAI request failed (${error.status ?? "unknown"}).`, secrets),
      { provider: PROVIDER },
    );
  }

  return new AppError(
    "unknown",
    redactSecrets(error instanceof Error ? error.message : "OpenAI request failed.", secrets),
    { provider: PROVIDER },
  );
}

/**
 * Run one structured request. The Zod schema is both the request contract
 * (strict JSON Schema) and the response validator.
 */
async function structured<T>(
  schema: z.ZodType<T>,
  name: string,
  system: string,
  user: string,
): Promise<T> {
  const api = getClient();
  const env = getEnv();
  try {
    const response = await api.responses.parse({
      model: env.OPENAI_MODEL,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: zodTextFormat(schema, name) },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new AppError(
        "malformed_response",
        "OpenAI returned no structured output. The request may have been refused.",
        { provider: PROVIDER },
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* 1. Normalise + classify                                                    */
/* -------------------------------------------------------------------------- */

export interface RawDiscovery {
  title: string;
  url: string;
  snippet: string;
  siteName: string;
  publishedDate?: string;
  sourceId: string;
  sourceName: string;
}

const NORMALISE_SYSTEM = `You are a research librarian for hackathon and product intelligence.

You receive raw web search results and must convert them into structured project records.

Rules you MUST follow:
- Only state what the supplied metadata supports. Never invent awards, rankings, statistics, quotes or features.
- If the metadata does not say which problem a project addresses, leave that field as an empty string.
- "award" may only be filled in when the supplied metadata explicitly states an award or a ranking. Otherwise use an empty string and set awardVerified to false.
- "platform" is the site the project was found on (e.g. Devpost, Unstop, Hacker News, or the site name from the URL).
- "summary" must be at most 2 sentences and must be factual, based only on the snippet/title.
- "technologies" lists only technologies explicitly named in the title or snippet. If none are named, return an empty array.
- "businessModel" and "distribution" may only be filled in when the metadata states them. Otherwise empty strings.
- "uncertaintyNotes" records what could NOT be determined from the metadata (e.g. "Award status not stated in search result"). Always return at least one note when information is missing.
- Preserve the original wording of the title; do not invent a different name.`;

export async function normaliseProjects(raw: RawDiscovery[]): Promise<NormalisedProjects> {
  if (raw.length === 0) return { projects: [] };

  const payload = raw.map((item, index) => ({
    index,
    title: item.title,
    url: item.url,
    site: item.siteName,
    snippet: item.snippet,
    publishedDate: item.publishedDate ?? null,
  }));

  const result = await structured(
    openAiNormaliseSchema,
    "project_records",
    NORMALISE_SYSTEM,
    `Normalise the following ${payload.length} search results into project records. Keep the same order and return exactly ${payload.length} records.\n\n${JSON.stringify(payload, null, 2)}`,
  );

  return { projects: result.projects };
}

/* -------------------------------------------------------------------------- */
/* 2. Cluster similar approaches                                              */
/* -------------------------------------------------------------------------- */

const CLUSTER_SYSTEM = `You are an analyst who groups similar project approaches.

Given project records, group them into clusters of genuinely similar approaches.
- Use 0-based indexes into the supplied list for memberIndexes.
- Every project may belong to at most one cluster; do not leave a cluster empty.
- "repeatedPatterns" lists things that genuinely recur across the members (e.g. "always a mobile app", "always an AI wrapper around a chat interface"). Only state a pattern when at least two members support it.
- "evidencedLimitations" lists limitations that the supplied records actually evidence. If the records do not evidence any limitation, return an empty array — do not speculate.
- "sharedBusinessModels" and "sharedDistribution" must be empty arrays unless the records state them.
- Do not invent competitors, features or claims that are not in the input.`;

export async function clusterProjects(projects: NormalisedProjects["projects"]): Promise<ClusteredProjects> {
  if (projects.length === 0) return { clusters: [] };

  const result = await structured(
    openAiClusterSchema,
    "approach_clusters",
    CLUSTER_SYSTEM,
    `Cluster the following ${projects.length} project records into approaches.\n\n${JSON.stringify(projects, null, 2)}`,
  );

  return { clusters: result.clusters };
}

/* -------------------------------------------------------------------------- */
/* 3. Idea generation + comparison with existing work                        */
/* -------------------------------------------------------------------------- */

const CONCEPT_SYSTEM = `You design genuinely differentiated hackathon project concepts.

You are given: the user's constraints, and a set of REAL existing projects collected from public sources.

Hard rules:
- Never present an existing project as if it were the user's idea. Compare explicitly instead.
- For each concept, list concrete comparisons against the closest existing projects. Similarity is a number between 0 and 1 where 1 means "functionally the same project".
- If a concept is highly similar to an existing project (similarity >= 0.7), set similarityWarning to a plain-language warning that names the overlapping project and says the idea is not novel.
- "differentiators" must describe what is meaningfully different about the user's concept, not vague adjectives.
- "risks" must list real, specific risks including unvalidated assumptions.
- "validationPlan" must describe experiments the team can actually run (interviews, landing-page test, prototype test), not market research claims.
- "commonGround" lists what most existing projects already do (so the user knows what is NOT differentiating).
- "unvalidated" lists assumptions nobody has tested yet.
- Do not invent market statistics, customer interviews, awards or competitor features.`;

export interface ConceptContext {
  constraints: string;
  existingProjects: Array<{
    title: string;
    platform: string;
    url: string;
    summary: string;
    problemAddressed: string;
    proposedSolution: string;
    targetUsers: string;
    technologies: string[];
  }>;
  gaps: Array<{ id: string; title: string; observation: string }>;
}

export async function generateConcepts(context: ConceptContext): Promise<Concepts> {
  const result = await structured(
    openAiConceptsSchema,
    "project_concepts",
    CONCEPT_SYSTEM,
    `Design ${3} differentiated concepts.

User constraints:
${context.constraints || "(none supplied)"}

Observed market gaps to build on:
${JSON.stringify(context.gaps, null, 2)}

Existing projects you must differentiate from (these belong to other people):
${JSON.stringify(context.existingProjects, null, 2)}`,
  );

  return result;
}

/* -------------------------------------------------------------------------- */
/* 4. Pitch review                                                            */
/* -------------------------------------------------------------------------- */

const PITCH_SYSTEM = `You write and critique hackathon pitch content.

You are given a user's raw notes about their own project and a set of evidence records collected from public sources.

Rules:
- Write the pitch in the user's own voice, based on their notes. Do not add features, results or numbers the user did not state.
- "validationResults" must only contain experiments the user actually ran. If the user has not run any, say so plainly.
- "attribution" lists the public projects the user's idea draws on, with their source names.
- "honestyNotes" lists anything a judge could challenge: unvalidated claims, untested assumptions, or overlap with existing work.
- "judgeQuestions" are the sharp questions judges are likely to ask, aimed at the weakest points.
- "demoOutline" is a short ordered list of demo beats, not a feature dump.
- clarityScore is 0-100 for how clearly the pitch communicates problem, user and solution.
- clarityNotes gives specific, actionable feedback.

Never fabricate statistics, awards, customer quotes or test results.`;

export interface PitchContext {
  notes: string;
  extra: string;
  concept?: { title: string; tagline: string; solution: string; targetUsers: string } | null;
  existingProjects: Array<{ title: string; platform: string; url: string; summary: string }>;
  experiments: Array<{ title: string; hypothesis: string; method: string; metric: string }>;
  gaps: Array<{ title: string; observation: string; proposedImprovement: string }>;
}

export async function reviewPitch(context: PitchContext): Promise<PitchReview> {
  const result = await structured(
    openAiPitchSchema,
    "pitch_review",
    PITCH_SYSTEM,
    `User notes:
${context.notes || "(none supplied)"}

${context.extra ? `Extra instructions:\n${context.extra}\n` : ""}
${context.concept ? `Chosen concept:\n${JSON.stringify(context.concept, null, 2)}\n` : ""}
Existing public projects (attribute, do not copy):
${JSON.stringify(context.existingProjects, null, 2)}

Validation experiments proposed so far:
${JSON.stringify(context.experiments, null, 2)}

Market gaps found in the research:
${JSON.stringify(context.gaps, null, 2)}`,
  );

  return result;
}

/* -------------------------------------------------------------------------- */
/* 5. Side-by-side comparison of existing approaches                          */
/* -------------------------------------------------------------------------- */

const COMPARE_SYSTEM = `You compare existing projects side by side so a hackathon team can see what is already common and what is genuinely different.

Rules:
- Only use the supplied records. Never invent a feature, an award, a business model or a limitation that the records do not state.
- "evidencedLimitations" must be limitations the records actually evidence. If a record evidences none, return an empty array.
- "award" may only be filled when the record states an award, and "awardVerified" must then be true. Otherwise use an empty string and false.
- "repeatedPatterns" lists approaches that genuinely recur across at least two records. Do not pad the list.
- "differences" lists concrete ways the records differ (different target user, different distribution, different business model, different technology bet) — not vague statements.
- "sharedAssumptions" lists assumptions the whole set seems to make without testing. Phrase them as assumptions, not facts.`;

export interface ComparisonInput {
  title: string;
  url: string;
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
}

export interface ComparisonResult {
  comparisons: Array<{
    title: string;
    url: string;
    platform: string;
    approach: string;
    targetUsers: string;
    businessModel: string;
    distribution: string;
    evidencedLimitations: string[];
    award: string;
    awardVerified: boolean;
  }>;
  repeatedPatterns: string[];
  commonTargetUsers: string[];
  commonBusinessModels: string[];
  commonDistribution: string[];
  sharedAssumptions: string[];
  differences: string[];
}

export async function compareProjects(records: ComparisonInput[]): Promise<ComparisonResult> {
  const result = await structured(
    openAiComparisonSchema,
    "project_comparison",
    COMPARE_SYSTEM,
    `Compare the following ${records.length} existing project records.\n\n${JSON.stringify(records, null, 2)}`,
  );

  return result;
}

/** Only used by tests — clears the memoised client. */
export function resetOpenAiClient(): void {
  client = undefined;
}

/* -------------------------------------------------------------------------- */
/* 6. Free-choice mode: concepts, scoring and recommendation                  */
/* -------------------------------------------------------------------------- */

const DISCOVERY_SYSTEM = `You design hackathon project concepts from evidence about what has already been built.

You are given: a real analysis of successful projects (patterns, weaknesses, underserved users, candidate problems), the project records themselves, and optionally the user's interests, technologies, team capabilities and constraints.

Rules:
- Generate exactly the requested number of concepts, each in a DIFFERENT domain.
- Score each concept on five axes, 0-10 each:
    feasibility      — can a small team build a demo of this in a hackathon?
    originality      — how different is it from the supplied existing projects? (not how clever it sounds)
    impact           — how much real-world value could it have if it worked?
    ambition         — technical ambition, without becoming unrealistic
    demoPotential    — can you show this working in 3-5 minutes on a stage?
  "totalScore" is the plain sum of the five scores (max 50).
- "scoreRationale" must justify EACH score using the supplied evidence or analysis, in one or two sentences. Never assert a score without a reason.
- "comparisons" must name the closest existing projects, with the URL from the supplied records, and the concrete differences. Similarity is 0-1 where 1 means "functionally the same project".
- "evidence" must link the claim to a supplied URL. If a claim has no source, put it in "uncertaintyNotes" instead.
- "risks" must be specific and include at least one unvalidated assumption.
- "validationPlan" must describe an experiment a team can actually run.
- "recommendedId" must be the id of the highest scoring concept, and the recommendation must explain why it is promising, how it differs from existing work, and what evidence supports it. List the caveats too.
- Never claim a project is guaranteed to be novel. Never invent awards, competition results, statistics, interviews or competitor features.
- The user's optional inputs are preferences, not hard constraints — unless the user explicitly says they are hard.`;

export interface DiscoveryContext {
  interests: string;
  techPreferences: string;
  teamCapabilities: string;
  constraints: string;
  count: number;
  analysis: {
    summary: string;
    recurringPatterns: Array<{ pattern: string; occurrences: string[]; evidenceCount: number }>;
    weaknesses: Array<{ weakness: string; occurrences: string[]; evidenceCount: number }>;
    underservedUsers: Array<{ segment: string; why: string; evidenceCount: number }>;
    opportunities: Array<{ opportunity: string; why: string; sourceUrls: string[] }>;
    candidateProblems: Array<{
      id: string;
      problem: string;
      affectedUsers: string[];
      whyNow: string;
      evidenceUrls: string[];
      feasibilityNote: string;
    }>;
  };
  existingProjects: Array<{
    title: string;
    platform: string;
    url: string;
    summary: string;
    problemAddressed: string;
    proposedSolution: string;
    targetUsers: string;
    technologies: string[];
  }>;
}

export async function generateDiscoveryConcepts(
  context: DiscoveryContext,
): Promise<z.infer<typeof openAiDiscoverySchema>> {
  const preferences = [
    context.interests && `Interests: ${context.interests}`,
    context.techPreferences && `Preferred technologies: ${context.techPreferences}`,
    context.teamCapabilities && `Team capabilities: ${context.teamCapabilities}`,
    context.constraints && `Constraints: ${context.constraints}`,
  ]
    .filter(Boolean)
    .join("\n");

  return structured(
    openAiDiscoverySchema,
    "discovery_concepts",
    DISCOVERY_SYSTEM,
    `Design ${context.count} concepts, one per domain, using the analysis and records below.

${preferences ? `Optional user preferences (use them to guide, they are not hard constraints unless the user says so):\n${preferences}\n` : "The user gave no preferences — choose the strongest problems you can evidence.\n"}
Analysis of the existing work:
${JSON.stringify(context.analysis, null, 2)}

Existing projects (belong to other people — compare, never present as the user's own):
${JSON.stringify(context.existingProjects, null, 2)}`,
  );
}

const PROPOSAL_SYSTEM = `You write a complete hackathon project proposal.

You are given a chosen concept, the evidence it came from, and the existing public projects it must be differentiated from.

Rules:
- The proposal must describe the concept that was chosen. Do not drift into a different idea.
- "coreFeatures" are the few things the team will actually build. 4-7 features, each with a one-sentence description.
- "techStack" lists specific technologies with a reason for each. Only include technologies the team can realistically use.
- "architecture" describes how the pieces fit together in plain language (components, data flow, what runs on device vs server).
- "implementationRoadmap" is 3-5 phases sized for a hackathon, each with a duration, concrete tasks and an exit criterion. The first phase must produce something demonstrable early.
- "validationPlan" states what the team will test, with whom, and what result would count as success. If the team has tested nothing yet, say that and describe what to test.
- "presentationOutline" is the slide-by-slide structure for a 5 minute pitch, with the content of each slide.
- "originalityDisclosure" states honestly what overlaps with existing work, what is genuinely different, and what remains unvalidated. Never claim guaranteed novelty.
- "attribution" lists the public projects this proposal draws on.
- "evidence" links factual claims to the supplied URLs. Claims without a source go in "uncertaintyNotes".
- Never invent statistics, awards, competition results, customer interviews or test results.`;

export async function buildProposal(input: {
  concept: {
    id: string;
    title: string;
    domain: string;
    tagline: string;
    problem: string;
    targetUsers: string;
    solution: string;
    differentiators: string[];
    risks: string[];
    validationPlan: string;
  };
  analysis: DiscoveryContext["analysis"];
  existingProjects: DiscoveryContext["existingProjects"];
  userNotes: string;
  interests: string;
  techPreferences: string;
  teamCapabilities: string;
  constraints: string;
}): Promise<z.infer<typeof openAiProposalSchema>> {
  const preferences = [
    input.interests && `Interests: ${input.interests}`,
    input.techPreferences && `Preferred technologies: ${input.techPreferences}`,
    input.teamCapabilities && `Team capabilities: ${input.teamCapabilities}`,
    input.constraints && `Constraints: ${input.constraints}`,
    input.userNotes && `Extra notes from the user: ${input.userNotes}`,
  ]
    .filter(Boolean)
    .join("\n");

  return structured(
    openAiProposalSchema,
    "project_proposal",
    PROPOSAL_SYSTEM,
    `Chosen concept:
${JSON.stringify(input.concept, null, 2)}

${preferences ? `User context:\n${preferences}\n` : ""}
Analysis of the existing work:
${JSON.stringify(input.analysis, null, 2)}

Existing public projects (attribute, never copy):
${JSON.stringify(input.existingProjects, null, 2)}`,
  );
}