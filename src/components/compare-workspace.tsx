"use client";

/**
 * Comparison workspace.
 *
 * Pick the approaches you want to line up side by side. The comparison is
 * generated from the stored records — the model is told not to invent
 * features, business models or limitations the records do not state.
 */
import { useState } from "react";

import { Alert, Tag, Button, Card, CardBody, CardHeader, EmptyState, Spinner } from "@/components/ui";
import type { ProjectRow } from "@/lib/projects";
import { cn } from "@/lib/utils";

interface ComparisonResponse {
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
  isDemo: boolean;
}

const COLUMNS = [
  { key: "approach", label: "Approach" },
  { key: "targetUsers", label: "Target users" },
  { key: "businessModel", label: "Business model" },
  { key: "distribution", label: "Distribution" },
] as const;

export function CompareWorkspace({
  jobId,
  projects,
}: {
  jobId: string;
  projects: ProjectRow[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setComparison(null);
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 6) return current;
      return [...current, id];
    });
  };

  const run = async () => {
    if (selected.length < 2) {
      setError("Select at least two projects to compare.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, projectIds: selected }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The comparison failed.");
        return;
      }
      setComparison(payload.comparison);
    } catch {
      setError("The comparison failed. Check that the server is running.");
    } finally {
      setPending(false);
    }
  };

  if (projects.length < 2) {
    return (
      <EmptyState
        title="Not enough records to compare"
        description="Collect at least two project records first, then come back to line up the approaches."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Choose the approaches to compare"
          description={`${selected.length} selected (2–6). The comparison is generated from what the records actually state.`}
          action={
            <Button onClick={run} disabled={pending || selected.length < 2}>
              {pending ? <Spinner /> : null}
              {pending ? "Comparing…" : "Compare"}
            </Button>
          }
        />
        <CardBody>
          {error ? (
            <Alert tone="bad" className="mb-4">
              {error}
            </Alert>
          ) : null}
          <ul className="grid gap-2 md:grid-cols-2">
            {projects.map((project) => {
              const isSelected = selected.includes(project.id);
              return (
                <li key={project.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border-[3px] p-3 transition-colors",
                      isSelected
                        ? "border-[3px] border-ink bg-acid"
                        : "border-[3px] border-ink bg-paper-2 hover:border-ink",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(project.id)}
                      className="border-[3px] mt-0.5 h-4 w-4 shrink-0 rounded border-ink text-punch focus:ring-punch"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {project.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/60">
                        {project.platform}
                        {project.domain ? ` · ${project.domain}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {comparison ? (
        <div className="space-y-6">
          {comparison.isDemo ? (
            <Alert tone="warn" title="Demo mode">
              No provider credentials are configured, so this comparison comes from the bundled
              sample dataset rather than a live model.
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryList title="Repeated patterns" items={comparison.repeatedPatterns} />
            <SummaryList title="Common target users" items={comparison.commonTargetUsers} />
            <SummaryList title="Common business models" items={comparison.commonBusinessModels} />
            <SummaryList title="Common distribution" items={comparison.commonDistribution} />
          </div>

          <Card>
            <CardHeader
              title="Side by side"
              description="Blank cells mean the record did not state it — ProjectScope does fill gaps in."
            />
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr>
                    <th className="border-[3px] sticky left-0 z-10 border-b-[3px] border-ink bg-paper-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                      Dimension
                    </th>
                    {comparison.comparisons.map((entry) => (
                      <th
                        key={`${entry.title}-${entry.url}`}
                        className="border-[3px] border-b-[3px] border-ink px-4 py-3 text-left align-top"
                      >
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="font-semibold text-ink hover:text-punch hover:underline"
                        >
                          {entry.title} ↗
                        </a>
                        <p className="mt-0.5 text-xs font-normal text-ink/60">{entry.platform}</p>
                        {entry.award ? (
                          <Tag tone={entry.awardVerified ? "mint" : "acid"} className="mt-1.5">
                            {entry.award}
                          </Tag>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COLUMNS.map((column) => (
                    <tr key={column.key}>
                      <th
                        scope="row"
                        className="border-[3px] sticky left-0 z-10 border-b-[3px] border-ink bg-paper-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60"
                      >
                        {column.label}
                      </th>
                      {comparison.comparisons.map((entry) => {
                        const value = entry[column.key];
                        return (
                          <td
                            key={`${entry.title}-${column.key}`}
                            className="border-[3px] border-b-[3px] border-ink px-4 py-3 align-top text-ink/80"
                          >
                            {value && value.trim() ? (
                              value
                            ) : (
                              <span className="text-ink/50">not stated</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th
                      scope="row"
                      className="border-[3px] sticky left-0 z-10 border-b-[3px] border-ink bg-paper-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60"
                    >
                      Evidenced limitations
                    </th>
                    {comparison.comparisons.map((entry) => (
                      <td
                        key={`${entry.title}-limits`}
                        className="border-[3px] border-b-[3px] border-ink px-4 py-3 align-top text-ink/80"
                      >
                        {entry.evidencedLimitations.length ? (
                          <ul className="space-y-1">
                            {entry.evidencedLimitations.map((limitation) => (
                              <li key={limitation}>• {limitation}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-ink/50">none evidenced</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="How these differ" />
              <CardBody>
                {comparison.differences.length ? (
                  <ul className="space-y-2 text-sm text-ink/80">
                    {comparison.differences.map((difference) => (
                      <li key={difference} className="flex gap-2">
                        <span className="text-good" aria-hidden>
                          ✓
                        </span>
                        {difference}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink/60">No differences were stated by the comparison.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Shared assumptions"
                description="What the whole set takes for granted without testing it."
              />
              <CardBody>
                {comparison.sharedAssumptions.length ? (
                  <ul className="space-y-2 text-sm text-ink/80">
                    {comparison.sharedAssumptions.map((assumption) => (
                      <li key={assumption} className="flex gap-2">
                        <span className="text-warn" aria-hidden>
                          •
                        </span>
                        {assumption}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink/60">No shared assumptions were stated.</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</p>
        {items.length ? (
          <ul className="mt-2 space-y-1.5 text-sm text-ink/80">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-punch" aria-hidden>
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink/50">None stated.</p>
        )}
      </CardBody>
    </Card>
  );
}
