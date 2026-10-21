import { after } from "next/server";

/**
 * Run work that must finish after the response has been sent.
 *
 * Why this exists: the research pipeline and the free-choice discovery run
 * are long jobs. They are started once the client has its id, and the
 * progress is streamed over SSE. A plain fire-and-forget promise would be
 * frozen by a serverless platform the moment the response is returned, and
 * the run would never finish. `after` tells the platform to keep the
 * invocation alive until the work settles.
 *
 * `after` needs a request scope. Outside one — a unit test that calls the
 * route handler directly, or a plain Node server without the request
 * context — it throws, so the task is started directly instead of the whole
 * request failing with a 500.
 */
export function runAfterResponse(task: () => Promise<unknown>): void {
  try {
    after(task);
  } catch {
    // No request scope: start the work now and let it run on its own.
    void task().catch((error) => {
      console.error("[projectscope] background task failed:", error);
    });
  }
}
