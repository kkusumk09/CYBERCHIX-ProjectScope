import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { readEvents } from "@/lib/research/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * The stream stays open for as long as the run takes, so it needs the same
 * budget as the run itself. Without it a serverless platform would cut the
 * stream off after the default function duration.
 */
export const maxDuration = 300;

/**
 * GET /api/research/[jobId]/events — server-sent events for research progress.
 *
 * The events live in the database, so the stream survives a dev-server
 * reload and the browser can reconnect with `Last-Event-ID` (or the `after`
 * query parameter) without losing anything.
 */
export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    const job = await prisma.researchJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true },
    });

    if (!job) {
      return Response.json(
        { error: { code: "not_found", message: "That research job does not exist." } },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const afterId = request.headers.get("last-event-id") ?? url.searchParams.get("after") ?? undefined;

    const encoder = new TextEncoder();
    let closed = false;
    let lastId = afterId ?? null;
    let poll: NodeJS.Timeout | undefined;
    let keepAlive: NodeJS.Timeout | undefined;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown, id?: string) => {
          if (closed) return;
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          let frame = "";
          if (id) frame += `id: ${id}\n`;
          frame += `event: ${event}\n`;
          frame += `data: ${payload}\n\n`;
          controller.enqueue(encoder.encode(frame));
        };

        const stop = () => {
          if (closed) return;
          closed = true;
          if (poll) clearInterval(poll);
          if (keepAlive) clearInterval(keepAlive);
          try {
            controller.close();
          } catch {
            // The client may already have closed the stream.
          }
        };

        // Send the backlog straight away so the UI is never empty.
        const backlog = await readEvents(jobId, lastId ?? undefined);
        for (const event of backlog) {
          lastId = event.id;
          send("progress", event, event.id);
        }

        poll = setInterval(async () => {
          if (closed) return;
          try {
            const events = await readEvents(jobId, lastId ?? undefined);
            for (const event of events) {
              lastId = event.id;
              send("progress", event, event.id);
            }

            const current = await prisma.researchJob.findUnique({
              where: { id: jobId },
              select: { status: true },
            });

            if (current && ["completed", "failed", "cancelled"].includes(current.status)) {
              // Give the client a beat to receive the final events.
              setTimeout(stop, 250);
            }
          } catch {
            // A transient database error should not kill the stream.
          }
        }, 900);

        keepAlive = setInterval(() => {
          if (closed) return;
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }, 15_000);

        request.signal.addEventListener("abort", stop);
      },
      cancel() {
        closed = true;
        if (poll) clearInterval(poll);
        if (keepAlive) clearInterval(keepAlive);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
