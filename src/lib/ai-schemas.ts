import { z } from "zod";

/**
 * Strict schemas for structured AI output.
 *
 * OpenAI's structured outputs (Responses API) and Gemini's `response_format`
 * both want a JSON Schema where *every* property is required — so these
 * schemas deliberately avoid `.default()` and `.optional()`.
 *
 * The lenient variants in `src/lib/schema.ts` are used when reading rows back
 * out of the database.
 */

/* ------------------------------- OpenAI ---------------------------------- */

export const openAiProjectSchema = z.object({
  title: z.string(),
  platform: z.string(),
  summary: z.string(),
  problemAddressed: z.string(),
  proposedSolution: z.string(),
  targetUsers: z.string(),
  technologies: z.array(z.string()),
  businessModel: z.string(),
  distribution: z.string(),
  award: z.string(),
  awardVerified: z.boolean(),
  domain: z.string(),
  uncertaintyNotes: z.array(z.string()),
});

export const openAiNormaliseSchema = z.object({
  projects: z.array(openAiProjectSchema),
});

export const openAiClusterSchema = z.object({
  clusters: z.array(
    z.object({
      clusterId: z.string(),
      label: z.string(),
      approach: z.string(),
      memberIndexes: z.array(z.number()),
      repeatedPatterns: z.array(z.string()),
      sharedTargetUsers: z.array(z.string()),
      sharedBusinessModels: z.array(z.string()),
      sharedDistribution: z.array(z.string()),
      evidencedLimitations: z.array(z.string()),
    }),
  ),
});

export const openAiConceptSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  problem: z.string(),
  targetUsers: z.string(),
  solution: z.string(),
  differentiators: z.array(z.string()),
  comparisons: z.array(
    z.object({
      existingProjectTitle: z.string(),
      existingProjectUrl: z.string(),
      overlap: z.string(),
      similarity: z.number(),
      differences: z.array(z.string()),
    }),
  ),
  risks: z.array(z.string()),
  validationPlan: z.string(),
  similarityWarning: z.string(),
});

export const openAiConceptsSchema = z.object({
  concepts: z.array(openAiConceptSchema),
  commonGround: z.array(z.string()),
  unvalidated: z.array(z.string()),
});

export const openAiPitchContentSchema = z.object({
  problem: z.string(),
  targetUser: z.string(),
  solution: z.string(),
  differentiator: z.string(),
  valueProposition: z.string(),
  validationResults: z.string(),
  businessModel: z.string(),
  goToMarket: z.string(),
  demoOutline: z.array(z.string()),
  judgeQuestions: z.array(z.string()),
  attribution: z.array(z.string()),
  honestyNotes: z.array(z.string()),
});

export const openAiPitchSchema = z.object({
  content: openAiPitchContentSchema,
  clarityScore: z.number(),
  clarityNotes: z.array(z.string()),
});

export const openAiComparisonSchema = z.object({
  comparisons: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      platform: z.string(),
      approach: z.string(),
      targetUsers: z.string(),
      businessModel: z.string(),
      distribution: z.string(),
      evidencedLimitations: z.array(z.string()),
      award: z.string(),
      awardVerified: z.boolean(),
    }),
  ),
  repeatedPatterns: z.array(z.string()),
  commonTargetUsers: z.array(z.string()),
  commonBusinessModels: z.array(z.string()),
  commonDistribution: z.array(z.string()),
  sharedAssumptions: z.array(z.string()),
  differences: z.array(z.string()),
});

/* ---------------------------- Free-choice mode ----------------------------- */

/**
 * A concept scored on the five axes the free-choice mode ranks by.
 * Each score is 0-10 and must be justified in the rationale.
 */
export const openAiDiscoveryScoreSchema = z.object({
  feasibility: z.number(),
  originality: z.number(),
  impact: z.number(),
  ambition: z.number(),
  demoPotential: z.number(),
});

export const openAiDiscoveryRationaleSchema = z.object({
  feasibility: z.string(),
  originality: z.string(),
  impact: z.string(),
  ambition: z.string(),
  demoPotential: z.string(),
});

export const openAiDiscoveryConceptSchema = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string(),
  tagline: z.string(),
  problem: z.string(),
  targetUsers: z.string(),
  solution: z.string(),
  differentiators: z.array(z.string()),
  comparisons: z.array(
    z.object({
      existingProjectTitle: z.string(),
      existingProjectUrl: z.string(),
      overlap: z.string(),
      similarity: z.number(),
      differences: z.array(z.string()),
    }),
  ),
  risks: z.array(z.string()),
  validationPlan: z.string(),
  scores: openAiDiscoveryScoreSchema,
  scoreRationale: openAiDiscoveryRationaleSchema,
  totalScore: z.number(),
  evidence: z.array(
    z.object({
      note: z.string(),
      sourceUrl: z.string(),
    }),
  ),
  uncertaintyNotes: z.array(z.string()),
});

export const openAiDiscoverySchema = z.object({
  concepts: z.array(openAiDiscoveryConceptSchema),
  recommendedId: z.string(),
  recommendation: z.object({
    whyPromising: z.string(),
    howItDiffers: z.string(),
    supportingEvidence: z.array(
      z.object({
        note: z.string(),
        sourceUrl: z.string(),
      }),
    ),
    caveats: z.array(z.string()),
  }),
  commonGround: z.array(z.string()),
  unvalidated: z.array(z.string()),
});

export const openAiProposalSchema = z.object({
  title: z.string(),
  abstract: z.string(),
  problemStatement: z.string(),
  targetUsers: z.string(),
  solution: z.string(),
  coreFeatures: z.array(z.object({ name: z.string(), description: z.string() })),
  techStack: z.array(z.object({ technology: z.string(), why: z.string() })),
  architecture: z.string(),
  implementationRoadmap: z.array(
    z.object({
      phase: z.string(),
      duration: z.string(),
      tasks: z.array(z.string()),
      exitCriteria: z.string(),
    }),
  ),
  validationPlan: z.string(),
  presentationOutline: z.array(z.object({ section: z.string(), content: z.string() })),
  originalityDisclosure: z.string(),
  attribution: z.array(z.string()),
  evidence: z.array(z.object({ note: z.string(), sourceUrl: z.string() })),
  uncertaintyNotes: z.array(z.string()),
});

/* ------------------------------- Gemini ---------------------------------- */

export const geminiGapSchema = z.object({
  id: z.string(),
  title: z.string(),
  observation: z.string(),
  supportingEvidence: z.array(z.string()),
  sourceUrls: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  assumptions: z.array(z.string()),
  affectedUsers: z.array(z.string()),
  proposedImprovement: z.string(),
  potentialBusinessValue: z.string(),
  validationExperiment: z.string(),
  claimType: z.enum(["evidence", "hypothesis"]),
});

export const geminiReportSchema = z.object({
  summary: z.string(),
  gaps: z.array(geminiGapSchema),
  patterns: z.array(
    z.object({
      pattern: z.string(),
      occurrences: z.array(z.string()),
      evidenceCount: z.number(),
    }),
  ),
  competitors: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      approach: z.string(),
      targetUsers: z.string(),
      businessModel: z.string(),
      distribution: z.string(),
      limitations: z.array(z.string()),
    }),
  ),
  assumptions: z.array(
    z.object({
      assumption: z.string(),
      whyItMatters: z.string(),
      howToValidate: z.string(),
    }),
  ),
  experiments: z.array(
    z.object({
      title: z.string(),
      hypothesis: z.string(),
      method: z.string(),
      metric: z.string(),
      successCriteria: z.string(),
      duration: z.string(),
      cost: z.string(),
      relatedGapId: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      source: z.string(),
    }),
  ),
  coverageNote: z.string(),
});

/**
 * Free-choice analysis. The model looks at successful projects and reports
 * what they share, what is weak, who is underserved and which real-world
 * problems look promising.
 */
export const geminiDiscoveryAnalysisSchema = z.object({
  summary: z.string(),
  recurringPatterns: z.array(
    z.object({
      pattern: z.string(),
      occurrences: z.array(z.string()),
      evidenceCount: z.number(),
    }),
  ),
  weaknesses: z.array(
    z.object({
      weakness: z.string(),
      occurrences: z.array(z.string()),
      evidenceCount: z.number(),
    }),
  ),
  underservedUsers: z.array(
    z.object({
      segment: z.string(),
      why: z.string(),
      evidenceCount: z.number(),
    }),
  ),
  opportunities: z.array(
    z.object({
      opportunity: z.string(),
      why: z.string(),
      sourceUrls: z.array(z.string()),
    }),
  ),
  candidateProblems: z.array(
    z.object({
      id: z.string(),
      problem: z.string(),
      affectedUsers: z.array(z.string()),
      whyNow: z.string(),
      evidenceUrls: z.array(z.string()),
      feasibilityNote: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      source: z.string(),
    }),
  ),
  coverageNote: z.string(),
});
