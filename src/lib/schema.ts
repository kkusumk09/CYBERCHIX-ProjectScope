import { z } from "zod";

/**
 * Shared Zod schemas.
 *
 * Three families live here:
 *  1. Request schemas  — validated at every route handler boundary.
 *  2. Provider schemas — validated before anything external is stored.
 *  3. AI output schemas — structured output from OpenAI and Gemini.
 *
 * Keeping them in one file makes the contract of the app easy to audit.
 */

/* -------------------------------------------------------------------------- */
/* Source registry                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The sources ProjectScope is allowed to touch.
 *
 * `access` documents exactly what we do with each source:
 *  - `search-metadata` : we run a web search and keep the title/snippet/url that
 *                        the search engine returned. We never open the page.
 *  - `fetch-page`      : we retrieve the page body through TinyFish Fetch.
 *  - `manual-only`     : we never retrieve anything automatically. The user
 *                        pastes data or imports a file they are entitled to.
 */
export const SOURCE_IDS = ["devpost", "unstop", "hackernews", "web"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const sourceIdSchema = z.enum(SOURCE_IDS);

export const SOURCE_REGISTRY: Record<
  SourceId,
  {
    id: SourceId;
    name: string;
    homepage: string;
    access: "search-metadata" | "fetch-page" | "manual-only";
    includeDomains: string[];
    /** Whether we may retrieve the project page itself. */
    allowsPageFetch: boolean;
    /** Plain-language explanation shown in the UI. */
    policyNote: string;
    /** Whether a user can manually add records for this source. */
    allowsManualImport: boolean;
  }
> = {
  devpost: {
    id: "devpost",
    name: "Devpost",
    homepage: "https://devpost.com",
    // Devpost's Terms of Service prohibit scraping and crawling. We therefore
    // never fetch project pages — only the search-result metadata a search
    // engine already exposes, plus the outbound link.
    access: "search-metadata",
    includeDomains: ["devpost.com"],
    allowsPageFetch: false,
    allowsManualImport: true,
    policyNote:
      "Devpost's Terms of Service prohibit scraping and crawling. ProjectScope therefore " +
      "shows search-result metadata and the original link only, and never retrieves " +
      "Devpost project pages automatically. Use manual entry or import a file you are " +
      "entitled to use.",
  },
  unstop: {
    id: "unstop",
    name: "Unstop",
    homepage: "https://unstop.com",
    access: "fetch-page",
    includeDomains: ["unstop.com"],
    allowsPageFetch: true,
    allowsManualImport: true,
    policyNote:
      "Unstop's robots.txt explicitly allows crawling of /competitions/ and /hackathons/ " +
      "for AI crawlers, and disallows /u/, /p/, /api/ and registration flows. ProjectScope " +
      "respects those rules: no login bypass, no CAPTCHA solving, no rate-limit evasion.",
  },
  hackernews: {
    id: "hackernews",
    name: "Hacker News (Algolia)",
    homepage: "https://hn.algolia.com",
    access: "fetch-page",
    includeDomains: ["news.ycombinator.com", "hn.algolia.com"],
    allowsPageFetch: true,
    allowsManualImport: true,
    policyNote:
      "Hacker News exposes a public search API (hn.algolia.com) that is intended for " +
      "programmatic use. ProjectScope uses it only for discovery and links back to the " +
      "original thread.",
  },
  web: {
    id: "web",
    name: "Open web",
    homepage: "https://example.com",
    access: "fetch-page",
    includeDomains: [],
    allowsPageFetch: true,
    allowsManualImport: true,
    policyNote:
      "General web results are discovered via the TinyFish Search API. ProjectScope stores " +
      "short summaries, factual metadata, attribution and the source URL — never a full " +
      "republication of a third-party submission.",
  },
};

export const sourceIdsSchema = z.array(sourceIdSchema).min(1);

/* -------------------------------------------------------------------------- */
/* Research request                                                           */
/* -------------------------------------------------------------------------- */

export const researchRequestSchema = z.object({
  topic: z.string().trim().min(3, "Topic must be at least 3 characters").max(300),
  problemStatement: z.string().trim().max(2000).optional().default(""),
  domain: z.string().trim().max(120).optional().default(""),
  targetUsers: z.string().trim().max(500).optional().default(""),
  geography: z.string().trim().max(120).optional().default(""),
  sources: sourceIdsSchema.default(["web", "devpost", "unstop", "hackernews"]),
  resultLimit: z.coerce.number().int().min(1).max(100).default(20),
  language: z.string().trim().max(10).optional().default("en"),
  location: z.string().trim().max(10).optional().default("US"),
});

export type ResearchRequest = z.infer<typeof researchRequestSchema>;

export const manualImportSchema = z.object({
  jobId: z.string().min(1),
  sourceId: sourceIdSchema,
  entries: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(300),
        url: z.url().optional().default(""),
        platform: z.string().trim().max(120).optional().default(""),
        summary: z.string().trim().max(2000).optional().default(""),
        problemAddressed: z.string().trim().max(2000).optional().default(""),
        proposedSolution: z.string().trim().max(2000).optional().default(""),
        targetUsers: z.string().trim().max(500).optional().default(""),
        technologies: z.array(z.string().trim().max(80)).max(30).optional().default([]),
        award: z.string().trim().max(200).optional().default(""),
        attribution: z.string().trim().max(300).optional().default(""),
      }),
    )
    .min(1, "Add at least one entry")
    .max(100),
});

export type ManualImportInput = z.infer<typeof manualImportSchema>;

export const analysisRequestSchema = z.object({
  jobId: z.string().min(1),
  /** Extra instructions from the user, forwarded to the analysis model. */
  focus: z.string().trim().max(1000).optional().default(""),
});

export const conceptRequestSchema = z.object({
  jobId: z.string().min(1),
  constraints: z.string().trim().max(2000).optional().default(""),
  count: z.coerce.number().int().min(2).max(5).default(3),
});

export const pitchRequestSchema = z.object({
  jobId: z.string().min(1),
  conceptId: z.string().optional().default(""),
  extra: z.string().trim().max(2000).optional().default(""),
});

export const compareRequestSchema = z.object({
  jobId: z.string().min(1),
  projectIds: z.array(z.string().min(1)).min(2).max(6),
});

export const saveProjectSchema = z.object({
  projectId: z.string().min(1),
  note: z.string().trim().max(1000).optional().default(""),
  /** Explicitly save (true) or remove (false). Defaults to saving. */
  saved: z.boolean().optional(),
});

export const exportRequestSchema = z.object({
  jobId: z.string().min(1),
  format: z.enum(["markdown", "json"]).default("markdown"),
});

/* -------------------------------------------------------------------------- */
/* Free-choice mode                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The free-choice request. Every field is optional — the user may leave all
 * of them blank and ProjectScope will still research, analyse and propose.
 */
export const discoveryRequestSchema = z.object({
  interests: z.string().trim().max(500).optional().default(""),
  techPreferences: z.string().trim().max(500).optional().default(""),
  teamCapabilities: z.string().trim().max(500).optional().default(""),
  constraints: z.string().trim().max(500).optional().default(""),
  sources: sourceIdsSchema.default(["web", "devpost", "unstop", "hackernews"]),
  resultLimit: z.coerce.number().int().min(5).max(100).default(30),
  conceptCount: z.coerce.number().int().min(3).max(5).default(5),
  language: z.string().trim().max(10).optional().default("en"),
  location: z.string().trim().max(10).optional().default("US"),
});

export type DiscoveryRequest = z.infer<typeof discoveryRequestSchema>;

export const proposalRequestSchema = z.object({
  conceptId: z.string().min(1),
  userNotes: z.string().trim().max(2000).optional().default(""),
});

/* -------------------------------------------------------------------------- */
/* Provider payloads                                                          */
/* -------------------------------------------------------------------------- */

export const searchResultSchema = z.object({
  position: z.number(),
  site_name: z.string(),
  snippet: z.string(),
  title: z.string(),
  url: z.string(),
  date: z.string().optional(),
  publisher: z.string().optional(),
  authors: z.array(z.string()).optional(),
  venue: z.string().optional(),
  year: z.number().optional(),
  cited_by_count: z.number().optional(),
  pdf_url: z.string().optional(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
  total_results: z.number(),
  page: z.number().default(0),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

export const fetchErrorSchema = z.object({
  url: z.string(),
  error: z.string(),
});

export const fetchedPageSchema = z.object({
  url: z.string(),
  final_url: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  published_date: z.string().nullable().optional(),
  format: z.string(),
  text: z.string().nullable().optional(),
});
export type FetchedPage = z.infer<typeof fetchedPageSchema>;

export const fetchResponseSchema = z.object({
  results: z.array(fetchedPageSchema),
  errors: z.array(fetchErrorSchema).default([]),
});
export type FetchResponse = z.infer<typeof fetchResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Normalised project record (OpenAI output)                                 */
/* -------------------------------------------------------------------------- */

export const normalisedProjectSchema = z.object({
  title: z.string().min(1),
  platform: z.string().min(1),
  summary: z.string().min(1),
  problemAddressed: z.string().default(""),
  proposedSolution: z.string().default(""),
  targetUsers: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  businessModel: z.string().default(""),
  distribution: z.string().default(""),
  award: z.string().default(""),
  awardVerified: z.boolean().default(false),
  domain: z.string().default(""),
  uncertaintyNotes: z.array(z.string()).default([]),
});
export type NormalisedProject = z.infer<typeof normalisedProjectSchema>;

export const normalisedProjectsSchema = z.object({
  projects: z.array(normalisedProjectSchema),
});
export type NormalisedProjects = z.infer<typeof normalisedProjectsSchema>;

export const clusteredProjectsSchema = z.object({
  clusters: z
    .array(
      z.object({
        clusterId: z.string(),
        label: z.string(),
        approach: z.string(),
        memberIndexes: z.array(z.number().int().nonnegative()),
        repeatedPatterns: z.array(z.string()),
        sharedTargetUsers: z.array(z.string()),
        sharedBusinessModels: z.array(z.string()),
        sharedDistribution: z.array(z.string()),
        evidencedLimitations: z.array(z.string()),
      }),
    )
    .default([]),
});
export type ClusteredProjects = z.infer<typeof clusteredProjectsSchema>;

/* -------------------------------------------------------------------------- */
/* Idea comparison (OpenAI output)                                           */
/* -------------------------------------------------------------------------- */

export const conceptComparisonSchema = z.object({
  existingProjectTitle: z.string(),
  existingProjectUrl: z.string().default(""),
  overlap: z.string(),
  similarity: z.number().min(0).max(1),
  differences: z.array(z.string()).default([]),
});

export const conceptSchema = z.object({
  title: z.string().min(1),
  tagline: z.string().min(1),
  problem: z.string().min(1),
  targetUsers: z.string().min(1),
  solution: z.string().min(1),
  differentiators: z.array(z.string()).min(1),
  comparisons: z.array(conceptComparisonSchema).default([]),
  risks: z.array(z.string()).default([]),
  validationPlan: z.string().min(1),
  similarityWarning: z.string().default(""),
});
export type Concept = z.infer<typeof conceptSchema>;

export const conceptsSchema = z.object({
  concepts: z.array(conceptSchema),
  commonGround: z.array(z.string()).default([]),
  unvalidated: z.array(z.string()).default([]),
});
export type Concepts = z.infer<typeof conceptsSchema>;

/* -------------------------------------------------------------------------- */
/* Market gap report (Gemini output)                                         */
/* -------------------------------------------------------------------------- */

export const confidenceSchema = z.enum(["low", "medium", "high"]);

export const sourceLinkSchema = z.object({
  title: z.string().default(""),
  url: z.string().default(""),
  source: z.string().default(""),
});
export type SourceLink = z.infer<typeof sourceLinkSchema>;

export const marketGapSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  observation: z.string().min(1),
  supportingEvidence: z.array(z.string()).min(1),
  sourceUrls: z.array(z.string()).default([]),
  confidence: confidenceSchema,
  assumptions: z.array(z.string()).default([]),
  affectedUsers: z.array(z.string()).default([]),
  proposedImprovement: z.string().default(""),
  potentialBusinessValue: z.string().default(""),
  validationExperiment: z.string().default(""),
  /** "evidence" = backed by a source, "hypothesis" = our reasoning. */
  claimType: z.enum(["evidence", "hypothesis"]).default("hypothesis"),
});
export type MarketGap = z.infer<typeof marketGapSchema>;

export const repeatedPatternSchema = z.object({
  pattern: z.string().min(1),
  occurrences: z.array(z.string()).default([]),
  evidenceCount: z.number().int().nonnegative().default(0),
});
export type RepeatedPattern = z.infer<typeof repeatedPatternSchema>;

export const competitorProfileSchema = z.object({
  name: z.string().min(1),
  url: z.string().default(""),
  approach: z.string().default(""),
  targetUsers: z.string().default(""),
  businessModel: z.string().default(""),
  distribution: z.string().default(""),
  limitations: z.array(z.string()).default([]),
});
export type CompetitorProfile = z.infer<typeof competitorProfileSchema>;

export const assumptionSchema = z.object({
  assumption: z.string().min(1),
  whyItMatters: z.string().default(""),
  howToValidate: z.string().default(""),
});
export type Assumption = z.infer<typeof assumptionSchema>;

export const experimentSchema = z.object({
  title: z.string().min(1),
  hypothesis: z.string().min(1),
  method: z.string().min(1),
  metric: z.string().min(1),
  successCriteria: z.string().min(1),
  duration: z.string().default(""),
  cost: z.string().default(""),
  relatedGapId: z.string().default(""),
});
export type Experiment = z.infer<typeof experimentSchema>;

export const marketGapReportSchema = z.object({
  summary: z.string().min(1),
  gaps: z.array(marketGapSchema).default([]),
  patterns: z.array(repeatedPatternSchema).default([]),
  competitors: z.array(competitorProfileSchema).default([]),
  assumptions: z.array(assumptionSchema).default([]),
  experiments: z.array(experimentSchema).default([]),
  sources: z.array(sourceLinkSchema).default([]),
  coverageNote: z.string().default(""),
});
export type MarketGapReport = z.infer<typeof marketGapReportSchema>;

/* -------------------------------------------------------------------------- */
/* Pitch (OpenAI output)                                                     */
/* -------------------------------------------------------------------------- */

export const pitchContentSchema = z.object({
  problem: z.string().default(""),
  targetUser: z.string().default(""),
  solution: z.string().default(""),
  differentiator: z.string().default(""),
  valueProposition: z.string().default(""),
  validationResults: z.string().default(""),
  businessModel: z.string().default(""),
  goToMarket: z.string().default(""),
  demoOutline: z.array(z.string()).default([]),
  judgeQuestions: z.array(z.string()).default([]),
  attribution: z.array(z.string()).default([]),
  honestyNotes: z.array(z.string()).default([]),
});
export type PitchContent = z.infer<typeof pitchContentSchema>;

export const pitchReviewSchema = z.object({
  content: pitchContentSchema,
  clarityScore: z.number().int().min(0).max(100),
  clarityNotes: z.array(z.string()).default([]),
});
export type PitchReview = z.infer<typeof pitchReviewSchema>;

/* -------------------------------------------------------------------------- */
/* Stored records                                                             */
/* -------------------------------------------------------------------------- */

export const sourceCheckSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  status: z.enum(["ok", "partial", "skipped", "failed", "manual"]),
  found: z.number().int().nonnegative().default(0),
  note: z.string().default(""),
});
export type SourceCheck = z.infer<typeof sourceCheckSchema>;

export const researchEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  stage: z.string(),
  message: z.string(),
  level: z.enum(["info", "success", "warning", "error"]),
  payload: z.unknown().optional(),
  createdAt: z.string(),
});
export type ResearchEvent = z.infer<typeof researchEventSchema>;
