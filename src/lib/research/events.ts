import "server-only";

/**
 * Research progress events.
 *
 * Events are persisted in SQLite and streamed to the browser over SSE. Using
 * the database (rather than an in-memory bus) means the progress history
 * survives a dev-server reload and works across processes.
 */
import { prisma } from "@/lib/db";
import { stringifyJson } from "@/lib/json";
import type { ResearchEvent } from "@/lib/schema";

export type EventLevel = "info" | "success" | "warning" | "error";

export interface EmitInput {
  type: string;
  stage: string;
  message: string;
  level?: EventLevel;
  payload?: unknown;
}

export async function emitEvent(jobId: string, input: EmitInput): Promise<ResearchEvent> {
  const row = await prisma.researchEvent.create({
    data: {
      jobId,
      type: input.type,
      stage: input.stage,
      message: input.message,
      level: input.level ?? "info",
      payload: stringifyJson(input.payload ?? {}),
    },
  });

  return {
    id: row.id,
    type: row.type,
    stage: row.stage,
    message: row.message,
    level: row.level as EventLevel,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Read the events for a job, optionally only those after a given id. */
export async function readEvents(jobId: string, afterId?: string) {
  const rows = await prisma.researchEvent.findMany({
    where: afterId ? { jobId, id: { gt: afterId } } : { jobId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    stage: row.stage,
    message: row.message,
    level: row.level as EventLevel,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  }));
}
