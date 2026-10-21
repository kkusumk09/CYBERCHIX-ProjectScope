"use client";

/**
 * Free-choice discovery studio.
 *
 * The user never has to name a problem. They can optionally give preferences
 * (interests, technologies, team capabilities, constraints) or leave every
 * field blank and let the evidence decide.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Tag,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { SOURCE_REGISTRY, type SourceId } from "@/lib/schema";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface DiscoveryConcept {
  id: string;
  title: string;
  domain: string;
  tagline: string;
  problem: string;
  targetUsers: string;
  solution: string;
  differentiators: string[];
  comparisons: Array<{
    existingProjectTitle: string;
    existingProjectUrl: string;
    overlap: string;
    similarity: number;
    differences: string[];
  }>;
  risks: string[];
  validationPlan: string;
  scores: {
    feasibility: number;
    originality: number;
    impact: number;
    ambition: number;
    demoPotential: number;
  };
  scoreRationale: {
    feasibility: string;
    originality: string;
    impact: string;
    ambition: string;
    demoPotential: string;
  };
  totalScore: number;
  evidence: Array<{ note: string; sourceUrl: string }>;
  uncertaintyNotes: string[];
}

interface DiscoveryAnalysis {
  summary?: string;
  recurringPatterns?: Array<{ pattern: string; occurrences: string[]; evidenceCount: number }>;
  weaknesses?: Array<{ weakness: string; occurrences: string[]; evidenceCount: number }>;
  underservedUsers?: Array<{ segment: string; why: string; evidenceCount: number }>;
  opportunities?: Array<{ opportunity: string; why: string; sourceUrls: string[] }>;
  candidateProblems?: Array<{
    id: string;
    problem: string;
    affectedUsers: string[];
    whyNow: string;
    evidenceUrls: string[];
    feasibilityNote: string;
  }>;
  sources?: Array<{ title: string; url: string; source: string }>;
  coverageNote?: string;
  commonGround?: string[];
  unvalidated?: string[];
}

interface Recommendation {
  conceptId: string;
  whyPromising: string;
  howItDiffers: string;
  supportingEvidence: Array<{ note: string; sourceUrl: string }>;
  caveats: string[];
}

interface ProposalContent {
  title: string;
  abstract: string;
  problemStatement: string;
  targetUsers: string;
  solution: string;
  coreFeatures: Array<{ name: string; description: string }>;
  techStack: Array<{ technology: string; why: string }>;
  architecture: string;
  implementationRoadmap: Array<{
    phase: string;
    duration: string;
    tasks: string[];
    exitCriteria: string;
  }>;
  validationPlan: string;
  presentationOutline: Array<{ section: string; content: string }>;
  originalityDisclosure: string;
  attribution: string[];
  evidence: Array<{ note: string; sourceUrl: string }>;
  uncertaintyNotes: string[];
}

interface DiscoveryState {
  id: string;
  jobId: string;
  interests: string;
  techPreferences: string;
  teamCapabilities: string;
  constraints: string;
  status: string;
  stage: string;
  isDemo: boolean;
  errorMessage: string | null;
  concepts: DiscoveryConcept[];
  recommendation: Recommendation | null;
  analysis: DiscoveryAnalysis;
  sourcesChecked: Array<{
    sourceId: string;
    sourceName: string;
    status: string;
    found: number;
    note: string;
  }>;
  resultCount: number;
}

interface LiveEvent {
  id: string;
  type: string;
  stage: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
  createdAt: string;
}

const SCORE_AXES = [
  { key: "feasibility", label: "Feasibility" },
  { key: "originality", label: "Originality" },
  { key: "impact", label: "Real-world impact" },
  { key: "ambition", label: "Technical ambition" },
  { key: "demoPotential", label: "Live-demo potential" },
] as const;

const SOURCE_ORDER: SourceId[] = ["devpost", "unstop", "hackernews", "web"];

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function DiscoveryStudio({ initial }: { initial: DiscoveryState | null }) {
  const router = useRouter();

  const [interests, setInterests] = useState(initial?.interests ?? "");
  const [techPreferences, setTechPreferences] = useState(initial?.techPreferences ?? "");
  const [teamCapabilities, setTeamCapabilities] = useState(initial?.teamCapabilities ?? "");
  const [constraints, setConstraints] = useState(initial?.constraints ?? "");
  const [sources, setSources] = useState<SourceId[]>(
    initial ? SOURCE_ORDER : ["web", "devpost", "unstop", "hackernews"],
  );
  const [conceptCount, setConceptCount] = useState(5);
  const [resultLimit, setResultLimit] = useState(30);

  const [state, setState] = useState<DiscoveryState | null>(initial);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [starting, setStarting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    initial?.recommendation?.conceptId ?? null,
  );
  const [proposal, setProposal] = useState<ProposalContent | null>(null);
  const [proposalPending, setProposalPending] = useState(false);
  const [notes, setNotes] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  /* ------------------------------ data loading ----------------------------- */

  const load = useCallback(async (discoveryId: string) => {
    const response = await fetch(`/api/discover?discoveryId=${discoveryId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setState(payload.discovery);
  }, []);

  /* ------------------------------ live events ------------------------------ */

  useEffect(() => {
    if (!state?.jobId) return;
    // Nothing left to stream once the run reached a terminal state.
    if (["completed", "failed", "cancelled"].includes(state.status)) return;

    const source = new EventSource(`/api/research/${state.jobId}/events`);

    source.addEventListener("progress", (message) => {
      try {
        const event = JSON.parse((message as MessageEvent).data) as LiveEvent;
        setEvents((current) =>
          current.some((item) => item.id === event.id) ? current : [...current, event],
        );
        if (event.type.startsWith("job.")) void load(state.id);
      } catch {
        // Ignore a malformed frame.
      }
    });

    return () => source.close();
  }, [state?.jobId, state?.id, state?.status, load]);

  /*
   * Polling fallback.
   *
   * The SSE stream can miss the final event when the background job finishes
   * between the request and the connection being opened. Polling while the run
   * is active guarantees the screen converges on the real final state instead
   * of waiting for a reload.
   */
  const activeStateId = state?.id;
  const activeStateStatus = state?.status;

  useEffect(() => {
    if (!activeStateId) return;
    if (activeStateStatus && ["completed", "failed", "cancelled"].includes(activeStateStatus)) return;

    const timer = setInterval(() => {
      void load(activeStateId);
    }, 3000);

    return () => clearInterval(timer);
  }, [activeStateId, activeStateStatus, load]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  /* -------------------------------- actions -------------------------------- */

  const start = async () => {
    setStarting(true);
    setError(null);
    setEvents([]);
    setProposal(null);
    setSelectedConceptId(null);
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests,
          techPreferences,
          teamCapabilities,
          constraints,
          sources,
          resultLimit,
          conceptCount,
          language: "en",
          location: "US",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The discovery run could not be started.");
        return;
      }
      router.push(`/discover?discoveryId=${payload.discovery.id}`);
    } catch {
      setError("The discovery run could not be started. Check that the server is running.");
    } finally {
      setStarting(false);
    }
  };

  const regenerate = async () => {
    if (!state) return;
    setRegenerating(true);
    setError(null);
    setProposal(null);
    setEvents([]);
    try {
      const response = await fetch(`/api/discover/${state.id}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "The concepts could not be regenerated.");
        return;
      }

      /*
       * The server resets the run and regenerates in the background. Flip the
       * local state to "running" straight away so the progress log and the
       * SSE stream come back — otherwise the button looked completely inert
       * and the user had to reload the page to see the new concepts.
       */
      setState((current) =>
        current
          ? {
              ...current,
              status: "running",
              stage: "queued",
              concepts: [],
              recommendation: null,
              errorMessage: null,
            }
          : current,
      );
    } catch {
      setError("The concepts could not be regenerated. Check that the server is running.");
    } finally {
      setRegenerating(false);
    }
  };

  const buildProposalFor = async (conceptId: string) => {
    if (!state) return;
    setProposalPending(true);
    setSelectedConceptId(conceptId);
    setError(null);
    try {
      const response = await fetch(`/api/discover/${state.id}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId, userNotes: notes }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The proposal could not be built.");
        return;
      }
      setProposal(payload.proposal.content);
    } catch {
      setError("The proposal could not be built. Check that the server is running.");
    } finally {
      setProposalPending(false);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-3),
    );
  };

  /* -------------------------------- derived -------------------------------- */

  const concepts = useMemo(() => state?.concepts ?? [], [state?.concepts]);
  const recommended = useMemo(
    () => concepts.find((concept) => concept.id === state?.recommendation?.conceptId) ?? null,
    [concepts, state?.recommendation?.conceptId],
  );
  const compared = useMemo(
    () => concepts.filter((concept) => compareIds.includes(concept.id)),
    [concepts, compareIds],
  );

  const isRunning = state ? !["completed", "failed", "cancelled"].includes(state.status) : false;

  /* --------------------------------- view ---------------------------------- */

  if (!state) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Find Me a Winning Project Idea"
            description="Every field below is optional. Leave them all blank and ProjectScope will decide from the evidence."
          />
          <CardBody className="space-y-5">
            {error ? (
              <Alert tone="bad" title="Could not start the run">
                {error}
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Interests (optional)"
                htmlFor="interests"
                hint="What you enjoy building. Used as a preference, not filter."
              >
                <Input
                  id="interests"
                  value={interests}
                  onChange={(event) => setInterests(event.target.value)}
                  placeholder="health, logistics, games"
                  maxLength={500}
                />
              </Field>
              <Field
                label="Preferred technologies (optional)"
                htmlFor="tech"
                hint="e.g. React, Python, a sponsor's API, hardware you have."
              >
                <Input
                  id="tech"
                  value={techPreferences}
                  onChange={(event) => setTechPreferences(event.target.value)}
                  placeholder="Next.js, Python, ESP32"
                  maxLength={500}
                />
              </Field>
              <Field
                label="Team capabilities (optional)"
                htmlFor="team"
                hint="What your team can actually build in the time you have."
              >
                <Input
                  id="team"
                  value={teamCapabilities}
                  onChange={(event) => setTeamCapabilities(event.target.value)}
                  placeholder="two web devs, one ML beginner, 48 hours"
                  maxLength={500}
                />
              </Field>
              <Field
                label="Constraints (optional)"
                htmlFor="constraints"
                hint="Hard limits, e.g. must work offline, no cloud spend."
              >
                <Input
                  id="constraints"
                  value={constraints}
                  onChange={(event) => setConstraints(event.target.value)}
                  placeholder="must work offline, web only"
                  maxLength={500}
                />
              </Field>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">
                Sources to research
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {SOURCE_ORDER.map((id) => {
                  const source = SOURCE_REGISTRY[id];
                  const active = sources.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setSources((current) =>
                          current.includes(id)
                            ? current.filter((item) => item !== id)
                            : [...current, id],
                        )
                      }
                      className={cn(
                        "rounded-xl border-[3px] px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-[3px] border-ink bg-acid"
                          : "border-[3px] border-ink hover:border-ink",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink">
                          {source.name}
                        </span>
                        {active ? <Tag tone="sky">on</Tag> : null}
                      </span>
                      <span className="mt-1 block text-xs text-ink/60">
                        {source.policyNote}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <Field label="Concepts to design" htmlFor="count" className="w-44">
                <Select
                  id="count"
                  value={String(conceptCount)}
                  onChange={(event) => setConceptCount(Number(event.target.value))}
                >
                  {[3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} concepts
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Records to research" htmlFor="limit" className="w-44">
                <Select
                  id="limit"
                  value={String(resultLimit)}
                  onChange={(event) => setResultLimit(Number(event.target.value))}
                >
                  {[15, 20, 30, 40, 50].map((value) => (
                    <option key={value} value={value}>
                      {value} records
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex-1" />

              <Button
               
                onClick={start}
                disabled={starting || sources.length === 0}
                className="w-full sm:w-auto"
              >
                {starting ? <Spinner /> : null}
                {starting ? "Starting…" : "Find Me a Winning Project Idea"}
              </Button>
            </div>

            <p className="text-xs text-ink/60">
              The run contacts only the sources you select, and only retrieves what each source
              allows. Devpost is search-metadata only, because its Terms of Service forbid
              scraping.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  /* ------------------------------- run in progress -------------------------- */

  if (isRunning) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Finding a project worth building"
            description="ProjectScope is researching the sources, looking for patterns and proposing problems on your behalf."
            action={<Tag tone="sky">{state.stage}</Tag>}
          />
          <CardBody>
            <div ref={logRef} className="max-h-96 space-y-2.5 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-ink/60">Waiting for the first event…</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="flex gap-3 text-sm">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        event.level === "success" && "bg-good-500",
                        event.level === "warning" && "bg-warn-500",
                        event.level === "error" && "bg-bad-500",
                        event.level === "info" && "bg-ink",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-ink/80">{event.message}</p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {new Date(event.createdAt).toLocaleTimeString()} · {event.stage}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sources checked" />
          <CardBody className="p-0">
            <ul className="divide-[3px]-y divide-ink">
              {state.sourcesChecked.length === 0 ? (
                <li className="px-5 py-4 text-sm text-ink/60">No source contacted yet.</li>
              ) : (
                state.sourcesChecked.map((check) => (
                  <li key={check.sourceId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="text-sm font-medium text-ink">
                      {check.sourceName}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-ink/60">
                      {check.found} record(s)
                      <Tag
                        tone={
                          check.status === "ok"
                            ? "mint"
                            : check.status === "partial"
                              ? "acid"
                              : check.status === "failed"
                                ? "punch"
                                : "paper"
                        }
                      >
                        {check.status}
                      </Tag>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
    );
  }

  /* -------------------------------- results --------------------------------- */

  return (
    <div className="space-y-6">
      {state.isDemo ? (
        <Alert tone="warn" title="Demo mode">
          No provider credentials are configured, so this run used the bundled sample dataset. The
          concepts below demonstrate the method — they are not research about a real market.
        </Alert>
      ) : null}

      {state.errorMessage ? (
        <Alert tone="bad" title="The run failed">
          {state.errorMessage}
        </Alert>
      ) : null}

      {error ? <Alert tone="bad">{error}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-ink/60">
          {state.resultCount} record(s) researched · {concepts.length} concept(s) designed
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="paper" onClick={regenerate} disabled={regenerating}>
            {regenerating ? <Spinner /> : null}
            {regenerating ? "Regenerating…" : "Regenerate ideas"}
          </Button>
          <Link
            href={`/projects?jobId=${state.jobId}`}
            className="inline-flex h-10 items-center rounded-lg border-[3px] border-ink bg-paper-2 px-4 text-sm font-semibold shadow-sm hover:bg-paper"
          >
            See the evidence
          </Link>
        </div>
      </div>

      {/* Analysis */}
      {state.analysis && Object.keys(state.analysis).length > 0 ? (
        <Card>
          <CardHeader
            title="What the existing work looks like"
            description="Patterns, weaknesses and underserved users found in the records that were researched."
          />
          <CardBody className="space-y-5">
            {state.analysis.summary ? (
              <p className="text-sm leading-relaxed text-ink/80">
                {state.analysis.summary}
              </p>
            ) : null}

            {state.analysis.coverageNote ? (
              <Alert tone="info">{state.analysis.coverageNote}</Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <AnalysisList
                title="Recurring patterns"
                items={(state.analysis.recurringPatterns ?? []).map((item) => ({
                  label: item.pattern,
                  detail: `${item.evidenceCount} record(s) · ${item.occurrences.join("; ")}`,
                }))}
              />
              <AnalysisList
                title="Weaknesses in the existing work"
                items={(state.analysis.weaknesses ?? []).map((item) => ({
                  label: item.weakness,
                  detail: `${item.evidenceCount} record(s) · ${item.occurrences.join("; ")}`,
                }))}
              />
              <AnalysisList
                title="Underserved users"
                items={(state.analysis.underservedUsers ?? []).map((item) => ({
                  label: item.segment,
                  detail: `${item.why} (${item.evidenceCount} record(s))`,
                }))}
              />
              <AnalysisList
                title="Opportunities"
                items={(state.analysis.opportunities ?? []).map((item) => ({
                  label: item.opportunity,
                  detail: item.why,
                  links: item.sourceUrls,
                }))}
              />
            </div>

            {state.analysis.candidateProblems && state.analysis.candidateProblems.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Problems ProjectScope identified on its own
                </p>
                <ul className="mt-2 space-y-2">
                  {state.analysis.candidateProblems.map((problem) => (
                    <li
                      key={problem.id}
                      className="rounded-xl border-[3px] border-ink bg-paper px-4 py-3"
                    >
                      <p className="text-sm font-medium text-ink">
                        {problem.problem}
                      </p>
                      <p className="mt-1 text-xs text-ink/60">
                        Affects: {problem.affectedUsers.join(", ")} · {problem.whyNow}
                      </p>
                      <p className="mt-1 text-xs text-ink/60">{problem.feasibilityNote}</p>
                      {problem.evidenceUrls.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {problem.evidenceUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-xs font-medium text-punch hover:underline"
                            >
                              {url.replace(/^https?:\/\//, "").slice(0, 48)} ↗
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* Recommendation */}
      {state.recommendation && recommended ? (
        <Card className="border-[3px] border-ink ring-1 ring-ink">
          <CardHeader
            title={`Recommended: ${recommended.title}`}
            description={recommended.tagline}
            action={<Tag tone="sky">top pick · {recommended.totalScore}/50</Tag>}
          />
          <CardBody className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                Why it is promising
              </p>
              <p className="mt-1 text-sm text-ink/80">
                {state.recommendation.whyPromising}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                How it differs from the existing work
              </p>
              <p className="mt-1 text-sm text-ink/80">
                {state.recommendation.howItDiffers}
              </p>
            </div>
            {state.recommendation.supportingEvidence.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Supporting evidence
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {state.recommendation.supportingEvidence.map((item) => (
                    <li key={item.sourceUrl} className="text-sm text-ink/80">
                      • {item.note}{" "}
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-medium text-punch hover:underline"
                      >
                        source ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {state.recommendation.caveats.length > 0 ? (
              <Alert tone="warn" title="Caveats">
                <ul className="list-disc space-y-1 pl-4">
                  {state.recommendation.caveats.map((caveat) => (
                    <li key={caveat}>{caveat}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            <Button onClick={() => buildProposalFor(recommended.id)} disabled={proposalPending}>
              {proposalPending ? <Spinner /> : null}
              {proposalPending ? "Writing…" : "Build the full proposal"}
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {/* Ranked concepts */}
      {concepts.length > 0 ? (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              {concepts.length} ranked concepts
            </h2>
            <p className="text-sm text-ink/60">Tick two or three to compare them side by side.</p>
          </div>

          <div className="mt-4 space-y-4">
            {concepts.map((concept, index) => {
              const isRecommended = concept.id === state.recommendation?.conceptId;
              const maxSimilarity = concept.comparisons.reduce(
                (max, comparison) => Math.max(max, comparison.similarity),
                0,
              );

              return (
                <Card
                  key={concept.id}
                  className={cn(isRecommended && "border-ink")}
                >
                  <CardHeader
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-ink/50">#{index + 1}</span>
                        {concept.title}
                      </span>
                    }
                    description={concept.tagline}
                    action={
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag tone="paper">{concept.domain}</Tag>
                        {isRecommended ? <Tag tone="sky">recommended</Tag> : null}
                        {maxSimilarity >= 0.7 ? (
                          <Tag tone="punch">{Math.round(maxSimilarity * 100)}% similar to existing work</Tag>
                        ) : null}
                        <Tag tone="paper">{concept.totalScore}/50</Tag>
                      </div>
                    }
                  />
                  <CardBody className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          Problem
                        </p>
                        <p className="mt-1 text-sm text-ink/80">{concept.problem}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          Target users
                        </p>
                        <p className="mt-1 text-sm text-ink/80">
                          {concept.targetUsers}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          Solution
                        </p>
                        <p className="mt-1 text-sm text-ink/80">
                          {concept.solution}
                        </p>
                      </div>
                    </div>

                    {/* Scores */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        How it scores
                      </p>
                      <ul className="mt-2 space-y-2">
                        {SCORE_AXES.map((axis) => {
                          const value = concept.scores[axis.key] ?? 0;
                          return (
                            <li key={axis.key}>
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-ink">
                                  {axis.label}
                                </span>
                                <span className="tabular-nums text-ink/70">
                                  {value}/10
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper">
                                <div
                                  className="h-full rounded-full bg-ink"
                                  style={{ width: `${(value / 10) * 100}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-ink/60">
                                {concept.scoreRationale[axis.key]}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {concept.comparisons.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          Explicit comparison with existing work
                        </p>
                        <div className="mt-2 space-y-2">
                          {concept.comparisons.map((comparison) => (
                            <div
                              key={`${comparison.existingProjectTitle}-${comparison.existingProjectUrl}`}
                              className="rounded-xl border-[3px] border-ink bg-paper px-3 py-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                {comparison.existingProjectUrl ? (
                                  <a
                                    href={comparison.existingProjectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="text-sm font-semibold text-punch hover:underline"
                                  >
                                    {comparison.existingProjectTitle} ↗
                                  </a>
                                ) : (
                                  <span className="text-sm font-semibold text-ink">
                                    {comparison.existingProjectTitle}
                                  </span>
                                )}
                                <Tag
                                  tone={
                                    comparison.similarity >= 0.7
                                      ? "punch"
                                      : comparison.similarity >= 0.45
                                        ? "acid"
                                        : "mint"
                                  }
                                >
                                  {Math.round(comparison.similarity * 100)}% similar
                                </Tag>
                              </div>
                              <p className="mt-1 text-sm text-ink/80">
                                {comparison.overlap}
                              </p>
                              {comparison.differences.length > 0 ? (
                                <ul className="mt-1.5 space-y-1 text-sm text-ink/70">
                                  {comparison.differences.map((difference) => (
                                    <li key={difference} className="flex gap-2">
                                      <span className="text-good" aria-hidden>
                                        +
                                      </span>
                                      {difference}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          Risks and unvalidated assumptions
                        </p>
                        <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
                          {concept.risks.length ? (
                            concept.risks.map((risk) => (
                              <li key={risk} className="flex gap-2">
                                <span className="text-warn" aria-hidden>
                                  •
                                </span>
                                {risk}
                              </li>
                            ))
                          ) : (
                            <li className="text-ink/50">None recorded.</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          How to validate it
                        </p>
                        <p className="mt-1.5 text-sm text-ink/80">
                          {concept.validationPlan}
                        </p>
                      </div>
                    </div>

                    {concept.uncertaintyNotes.length > 0 ? (
                      <Alert tone="warn" title="What is still uncertain">
                        <ul className="list-disc space-y-1 pl-4">
                          {concept.uncertaintyNotes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </Alert>
                    ) : null}

                    {concept.evidence.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                          Evidence
                        </p>
                        <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
                          {concept.evidence.map((item) => (
                            <li key={item.sourceUrl}>
                              • {item.note}{" "}
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="font-medium text-punch hover:underline"
                              >
                                source ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="border-[3px] flex flex-wrap items-center gap-3 border-t-[3px] border-ink pt-4">
                      <Button
                        tone={selectedConceptId === concept.id ? "ink" : "paper"}
                        onClick={() => buildProposalFor(concept.id)}
                        disabled={proposalPending}
                      >
                        {proposalPending && selectedConceptId === concept.id ? <Spinner /> : null}
                        {selectedConceptId === concept.id
                          ? "Rebuild the proposal"
                          : "Build the proposal"}
                      </Button>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/60">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(concept.id)}
                          onChange={() => toggleCompare(concept.id)}
                          className="border-[3px] h-4 w-4 rounded border-ink text-punch focus:ring-punch"
                        />
                        compare
                      </label>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          title="No concepts were produced"
          description="The run finished without designing any concepts. Check the sources that were checked and try a regenerate."
        />
      )}

      {/* Comparison */}
      {compared.length >= 2 ? (
        <Card>
          <CardHeader
            title="Side-by-side comparison"
            description="The same five axes for the concepts you ticked."
          />
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr>
                  <th className="border-[3px] border-b-[3px] border-ink px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                    Axis
                  </th>
                  {compared.map((concept) => (
                    <th
                      key={concept.id}
                      className="border-[3px] border-b-[3px] border-ink px-4 py-3 text-left align-top"
                    >
                      <span className="font-semibold text-ink">
                        {concept.title}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-ink/60">
                        {concept.domain}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCORE_AXES.map((axis) => (
                  <tr key={axis.key}>
                    <th
                      scope="row"
                      className="border-[3px] border-b-[3px] border-ink px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60"
                    >
                      {axis.label}
                    </th>
                    {compared.map((concept) => (
                      <td
                        key={concept.id}
                        className="border-[3px] border-b-[3px] border-ink px-4 py-3 align-top tabular-nums"
                      >
                        {concept.scores[axis.key]}/10
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th
                    scope="row"
                    className="border-[3px] border-b-[3px] border-ink px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60"
                  >
                    Total
                  </th>
                  {compared.map((concept) => (
                    <td
                      key={concept.id}
                      className="border-[3px] border-b-[3px] border-ink px-4 py-3 align-top font-semibold tabular-nums"
                    >
                      {concept.totalScore}/50
                    </td>
                  ))}
                </tr>
                <tr>
                  <th
                    scope="row"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60"
                  >
                    Target users
                  </th>
                  {compared.map((concept) => (
                    <td key={concept.id} className="px-4 py-3 align-top text-ink/80">
                      {concept.targetUsers}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}

      {/* Proposal */}
      {proposal ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Your notes for the proposal"
              description="Anything the proposal must respect: what your team can build, you already have, sponsors require."
            />
            <CardBody>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. we have a sponsor API for payments, two devs, and the demo must run on phone."
                maxLength={2000}
              />
              <p className="mt-2 text-xs text-ink/60">
                Change the notes and press “Rebuild the proposal” on the concept you want.
              </p>
            </CardBody>
          </Card>

          <ProposalView proposal={proposal} />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

function AnalysisList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; detail: string; links?: string[] }>;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="rounded-xl border-[3px] border-ink bg-paper px-3 py-2.5"
          >
            <p className="text-sm font-medium text-ink">{item.label}</p>
            <p className="mt-0.5 text-xs text-ink/70">{item.detail}</p>
            {item.links && item.links.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {item.links.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-xs font-medium text-punch hover:underline"
                  >
                    {url.replace(/^https?:\/\//, "").slice(0, 46)} ↗
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProposalView({ proposal }: { proposal: ProposalContent }) {
  const [copied, setCopied] = useState(false);

  const asMarkdown = () =>
    [
      `# ${proposal.title}`,
      "",
      proposal.abstract,
      "",
      "## Problem statement",
      proposal.problemStatement,
      "",
      "## Target users",
      proposal.targetUsers,
      "",
      "## Solution",
      proposal.solution,
      "",
      "## Core features",
      ...proposal.coreFeatures.map((feature) => `- **${feature.name}** — ${feature.description}`),
      "",
      "## Tech stack",
      ...proposal.techStack.map((item) => `- **${item.technology}** — ${item.why}`),
      "",
      "## Architecture",
      proposal.architecture,
      "",
      "## Implementation roadmap",
      ...proposal.implementationRoadmap.flatMap((phase) => [
        `### ${phase.phase} (${phase.duration})`,
        ...phase.tasks.map((task) => `- ${task}`),
        `_Exit criteria: ${phase.exitCriteria}_`,
        "",
      ]),
      "## Validation plan",
      proposal.validationPlan,
      "",
      "## Presentation outline",
      ...proposal.presentationOutline.map((item) => `- **${item.section}** — ${item.content}`),
      "",
      "## Originality & honesty",
      proposal.originalityDisclosure,
      "",
      "## Inspiration & source attribution",
      ...proposal.attribution.map((item) => `- ${item}`),
      "",
      "## Evidence",
      ...proposal.evidence.map((item) => `- ${item.note} (${item.sourceUrl})`),
      "",
      "## Uncertainty",
      ...proposal.uncertaintyNotes.map((item) => `- ${item}`),
    ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the user can still select the text.
    }
  };

  return (
    <Card className="border-[3px] border-ink">
      <CardHeader
        title={`Project proposal: ${proposal.title}`}
        description="A complete, buildable proposal. Edit it, test then be honest about what you actually did."
        action={
          <Button tone="paper" onClick={copy}>
            {copied ? "Copied" : "Copy as Markdown"}
          </Button>
        }
      />
      <CardBody className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Abstract</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            {proposal.abstract}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
              Problem statement
            </p>
            <p className="mt-1 text-sm text-ink/80">{proposal.problemStatement}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Target users</p>
            <p className="mt-1 text-sm text-ink/80">{proposal.targetUsers}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Solution</p>
          <p className="mt-1 text-sm text-ink/80">{proposal.solution}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Core features</p>
          <ul className="mt-2 space-y-1.5">
            {proposal.coreFeatures.map((feature) => (
              <li key={feature.name} className="text-sm text-ink/80">
                <span className="font-semibold">{feature.name}</span> — {feature.description}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Tech stack</p>
          <ul className="mt-2 space-y-1.5">
            {proposal.techStack.map((item) => (
              <li key={item.technology} className="text-sm text-ink/80">
                <span className="font-semibold">{item.technology}</span> — {item.why}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Architecture</p>
          <p className="mt-1 text-sm text-ink/80">{proposal.architecture}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
            Implementation roadmap
          </p>
          <ol className="mt-2 space-y-3">
            {proposal.implementationRoadmap.map((phase) => (
              <li
                key={phase.phase}
                className="rounded-xl border-[3px] border-ink bg-paper px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{phase.phase}</p>
                  <Tag tone="paper">{phase.duration}</Tag>
                </div>
                <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
                  {phase.tasks.map((task) => (
                    <li key={task} className="flex gap-2">
                      <span className="text-punch" aria-hidden>
                        •
                      </span>
                      {task}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink/60">
                  <span className="font-semibold">Exit criteria:</span> {phase.exitCriteria}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
            Validation plan
          </p>
          <p className="mt-1 text-sm text-ink/80">{proposal.validationPlan}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
            Hackathon presentation outline
          </p>
          <ol className="mt-2 space-y-2">
            {proposal.presentationOutline.map((item, index) => (
              <li key={item.section} className="text-sm text-ink/80">
                <span className="font-semibold">
                  {index + 1}. {item.section}
                </span>{" "}
                — {item.content}
              </li>
            ))}
          </ol>
        </div>

        <Alert tone="warn" title="Originality & honesty">
          {proposal.originalityDisclosure}
        </Alert>

        {proposal.attribution.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
              Inspiration & source attribution
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
              {proposal.attribution.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {proposal.evidence.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Evidence</p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
              {proposal.evidence.map((item) => (
                <li key={item.sourceUrl}>
                  • {item.note}{" "}
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-medium text-punch hover:underline"
                  >
                    source ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {proposal.uncertaintyNotes.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Uncertainty</p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink/80">
              {proposal.uncertaintyNotes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
