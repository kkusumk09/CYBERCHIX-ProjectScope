"use client";

/**
 * Live research view.
 *
 * Progress arrives over server-sent events from
 * GET /api/research/[jobId]/events. The events are persisted server-side, so
 * a reload replays the full history instead of starting blank.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, Tag, Button, Card, CardBody, CardHeader, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface LiveEvent {
  id: string;
  type: string;
  stage: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
  payload?: unknown;
  createdAt: string;
}

export interface LiveJob {
  id: string;
  topic: string;
  problemStatement: string | null;
  domain: string | null;
  targetUsers: string | null;
  geography: string | null;
  status: string;
  stage: string;
  isDemo: boolean;
  errorMessage: string | null;
  resultCount: number;
  sourcesChecked: Array<{
    sourceId: string;
    sourceName: string;
    status: string;
    found: number;
    note: string;
  }>;
}

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  discovering: "Discovering sources",
  normalising: "Normalising records",
  storing: "Storing evidence",
  analysing: "Analysing evidence",
  done: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STAGE_ORDER = ["queued", "discovering", "normalising", "storing", "analysing", "done"];

function stageIndex(stage: string): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index === -1 ? 0 : index;
}

export function LiveResearch({ initialJob, initialEvents }: { initialJob: LiveJob; initialEvents: LiveEvent[] }) {
  const [events, setEvents] = useState<LiveEvent[]>(initialEvents);
  const [job, setJob] = useState<LiveJob>(initialJob);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const refreshJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/research/${initialJob.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setJob(payload.job);
    } catch {
      // Ignore transient failures; the next event will try again.
    }
  }, [initialJob.id]);

  useEffect(() => {
    // There is nothing left to stream once the job reached a terminal state,
    // so we do not open a connection that would immediately report an error.
    if (["completed", "failed", "cancelled"].includes(job.status)) return;

    const source = new EventSource(`/api/research/${initialJob.id}/events`);

    source.addEventListener("open", () => setConnected(true));

    source.addEventListener("progress", (message) => {
      try {
        const event = JSON.parse((message as MessageEvent).data) as LiveEvent;
        setEvents((current) => {
          if (current.some((item) => item.id === event.id)) return current;
          return [...current, event];
        });
        if (event.type.startsWith("job.")) void refreshJob();
      } catch {
        // A malformed frame should not break the stream.
      }
    });

    source.addEventListener("error", () => {
      setConnected(false);
      // The browser retries automatically; the server sends the backlog on
      // reconnect so nothing is lost.
    });

    return () => source.close();
  }, [initialJob.id, job.status, refreshJob]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  const cancel = async () => {
    try {
      await fetch(`/api/research/${initialJob.id}/cancel`, { method: "POST" });
      await refreshJob();
    } catch {
      setError("Could not cancel the run.");
    }
  };

  const isRunning = !["completed", "failed", "cancelled"].includes(job.status);
  const progress = Math.round(((stageIndex(job.stage) + 1) / STAGE_ORDER.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={isRunning ? "sky" : job.status === "completed" ? "mint" : "punch"}>
              {job.status}
            </Tag>
            {job.isDemo ? <Tag tone="acid">demo data — not live research</Tag> : null}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            {job.topic}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Stage: {STAGE_LABELS[job.stage] ?? job.stage} · {job.resultCount} record(s) found
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isRunning ? (
            <Button tone="paper" onClick={cancel}>
              Cancel
            </Button>
          ) : null}
          <Button tone="paper" onClick={() => refreshJob()}>
            Refresh
          </Button>
          <Link
            href={`/projects?jobId=${job.id}`}
            className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-ink-soft"
          >
            Open projects
          </Link>
        </div>
      </div>

      {job.isDemo ? (
        <Alert tone="warn" title="Demo mode">
          No provider credentials are configured, so this run used the bundled sample dataset.
          Nothing here is a live research result.
        </Alert>
      ) : null}

      {error ? <Alert tone="bad">{error}</Alert> : null}

      {job.errorMessage ? <Alert tone="bad" title="The run failed">{job.errorMessage}</Alert> : null}

      {/* Stages */}
      <Card>
        <CardBody>
          <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {STAGE_ORDER.filter((stage) => stage !== "queued").map((stage) => {
              const current = stageIndex(job.stage);
              const index = STAGE_ORDER.indexOf(stage);
              const done = index < current || job.status === "completed";
              const active = index === current && isRunning;
              return (
                <li
                  key={stage}
                  className={cn(
                    "rounded-lg border-[3px] px-3 py-2 text-xs font-medium",
                    done && "border-good-500/40 bg-mint text-ink",
                    active && "border-[3px] border-ink bg-acid text-punch",
                    !done && !active && "border-[3px] border-ink text-ink/50",
                  )}
                >
                  {active ? <Spinner className="mr-1.5 h-3 w-3" /> : null}
                  {STAGE_LABELS[stage]}
                </li>
              );
            })}
          </ol>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Event log */}
        <Card>
          <CardHeader
            title="Progress"
            description={
              isRunning
                ? connected
                  ? "Streaming live from the server."
                  : "Reconnecting… (events are saved, so nothing is lost)."
                : "The finished run, replayed from the saved event log."
            }
            action={
              <Tag tone={isRunning ? (connected ? "mint" : "acid") : "paper"}>
                {isRunning ? (connected ? "live" : "offline") : "finished"}
              </Tag>
            }
          />
          <CardBody className="p-0">
            <div ref={logRef} className="max-h-[32rem] overflow-y-auto px-5 py-4">
              {events.length === 0 ? (
                <p className="text-sm text-ink/60">Waiting for the first event…</p>
              ) : (
                <ol className="space-y-2.5">
                  {events.map((event) => (
                    <li key={event.id} className="flex gap-3 text-sm">
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
                        <p
                          className={cn(
                            "text-ink/80",
                            event.level === "error" && "text-bad-700",
                            event.level === "warning" && "text-warn-700",
                          )}
                        >
                          {event.message}
                        </p>
                        <p className="mt-0.5 text-xs text-ink/50">
                          {new Date(event.createdAt).toLocaleTimeString()} · {event.stage}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Sources checked */}
        <Card>
          <CardHeader
            title="Sources checked"
            description="Only the sources listed here were actually contacted."
          />
          <CardBody className="p-0">
            {job.sourcesChecked.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink/60">No source has been contacted yet.</p>
            ) : (
              <ul className="divide-[3px]-y divide-ink">
                {job.sourcesChecked.map((check) => (
                  <li key={check.sourceId} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {check.sourceName}
                      </span>
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
                    </div>
                    <p className="mt-1 text-xs text-ink/60">
                      {check.found} record(s) found
                    </p>
                    {check.note ? (
                      <p className="mt-1 text-xs text-ink/60">{check.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {!isRunning ? (
        <Card>
          <CardHeader title="Next steps" />
          <CardBody className="flex flex-wrap gap-2">
            <Link
              href={`/report?jobId=${job.id}`}
              className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-ink shadow-sm hover:bg-ink-soft"
            >
              Read the market-gap report
            </Link>
            <Link
              href={`/compare?jobId=${job.id}`}
              className="inline-flex h-10 items-center rounded-lg border-[3px] border-ink bg-paper-2 px-4 text-sm font-semibold shadow-sm hover:bg-paper"
            >
              Compare approaches
            </Link>
            <Link
              href={`/ideas?jobId=${job.id}`}
              className="inline-flex h-10 items-center rounded-lg border-[3px] border-ink bg-paper-2 px-4 text-sm font-semibold shadow-sm hover:bg-paper"
            >
              Open the Idea Studio
            </Link>
            <Link
              href={`/pitch?jobId=${job.id}`}
              className="inline-flex h-10 items-center rounded-lg border-[3px] border-ink bg-paper-2 px-4 text-sm font-semibold shadow-sm hover:bg-paper"
            >
              Open the Pitch Studio
            </Link>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
