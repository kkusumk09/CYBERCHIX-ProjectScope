"use client";

/**
 * Original Idea Studio.
 *
 * Concepts are generated against the collected evidence and must carry an
 * explicit comparison with the existing projects. A high-similarity concept
 * is shown with a warning, never as a fresh idea.
 */
import { useState } from "react";

import { Alert, Tag, Button, Card, CardBody, CardHeader, EmptyState, Field, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ConceptComparison {
  existingProjectTitle: string;
  existingProjectUrl: string;
  overlap: string;
  similarity: number;
  differences: string[];
}

interface Concept {
  id?: string;
  title: string;
  tagline: string;
  problem: string;
  targetUsers: string;
  solution: string;
  differentiators: string[];
  comparisons: ConceptComparison[];
  risks: string[];
  validationPlan: string;
  similarityWarning?: string | null;
}

export function IdeaStudio({ jobId, initialConcepts }: { jobId: string; initialConcepts: Concept[] }) {
  const [constraints, setConstraints] = useState("");
  const [count, setCount] = useState(3);
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts);
  const [commonGround, setCommonGround] = useState<string[]>([]);
  const [unvalidated, setUnvalidated] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, constraints, count }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The concepts could not be generated.");
        return;
      }
      setConcepts(payload.concepts ?? []);
      setCommonGround(payload.commonGround ?? []);
      setUnvalidated(payload.unvalidated ?? []);
    } catch {
      setError("The concepts could not be generated. Check that the server is running.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Your constraints"
          description="Time, stack, rules of the hackathon, what you already have, must not do."
        />
        <CardBody className="space-y-4">
          <Field
            label="Constraints and must-haves"
            htmlFor="constraints"
            hint="For example: 48 hours, a web app, must use the sponsor's API, rural users only."
          >
            <Textarea
              id="constraints"
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="48 hours, web only, must work offline, sponsor API is optional."
              maxLength={2000}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              Concepts to generate
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="h-9 rounded-lg border-[3px] border-ink bg-paper-2 px-2 text-sm shadow-sm"
              >
                {[2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <Button onClick={generate} disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Designing…" : "Generate concepts"}
            </Button>
          </div>

          {error ? (
            <Alert tone="bad" title="Could not generate concepts">
              {error}
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      {commonGround.length > 0 || unvalidated.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {commonGround.length > 0 ? (
            <Card>
              <CardHeader
                title="Already common"
                description="What the existing projects all do — so you know what is NOT differentiating."
              />
              <CardBody>
                <ul className="space-y-2 text-sm text-ink/80">
                  {commonGround.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-ink/50" aria-hidden>
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {unvalidated.length > 0 ? (
            <Card>
              <CardHeader
                title="Still unvalidated"
                description="Assumptions nobody has tested yet."
              />
              <CardBody>
                <ul className="space-y-2 text-sm text-ink/80">
                  {unvalidated.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-warn" aria-hidden>
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      ) : null}

      {concepts.length === 0 ? (
        <EmptyState
          title="No concepts yet"
          description="Add your constraints and generate concepts. Each one is checked against the projects that already exist."
        />
      ) : (
        <div className="space-y-5">
          {concepts.map((concept, index) => {
            const maxSimilarity = concept.comparisons.reduce(
              (max, comparison) => Math.max(max, comparison.similarity),
              0,
            );
            const isVerySimilar = maxSimilarity >= 0.7;

            return (
              <Card
                key={concept.id ?? concept.title}
                className={cn(isVerySimilar && "border-bad-500/60")}
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
                    <div className="flex flex-wrap gap-1.5">
                      {isVerySimilar ? (
                        <Tag tone="punch">high similarity — not novel</Tag>
                      ) : maxSimilarity > 0 ? (
                        <Tag tone="acid">{Math.round(maxSimilarity * 100)}% closest match</Tag>
                      ) : null}
                    </div>
                  }
                />
                <CardBody className="space-y-5">
                  {concept.similarityWarning ? (
                    <Alert tone="bad" title="Similarity warning">
                      {concept.similarityWarning}
                    </Alert>
                  ) : null}

                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        Problem
                      </dt>
                      <dd className="mt-1 text-sm text-ink/80">{concept.problem}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        Target users
                      </dt>
                      <dd className="mt-1 text-sm text-ink/80">
                        {concept.targetUsers}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                        Solution
                      </dt>
                      <dd className="mt-1 text-sm text-ink/80">{concept.solution}</dd>
                    </div>
                  </dl>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                      What is meaningfully different
                    </p>
                    <ul className="mt-1.5 space-y-1.5 text-sm text-ink/80">
                      {concept.differentiators.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-good" aria-hidden>
                            ✓
                          </span>
                          {item}
                        </li>
                      ))}
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
                      <ul className="mt-1.5 space-y-1.5 text-sm text-ink/80">
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
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
