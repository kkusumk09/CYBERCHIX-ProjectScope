"use client";

/** Toggle buttons that call a small API endpoint and then refresh the view. */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Turn a failed response into a message the user can act on.
 * A silent failure here would look like the button simply does nothing.
 */
async function describeFailure(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    const message = payload?.error?.message;
    if (typeof message === "string" && message.trim()) return message;
  } catch {
    // The body was not JSON — fall through to the generic message.
  }
  return `${fallback} (HTTP ${response.status})`;
}

export function BookmarkButton({
  jobId,
  initialSaved,
}: {
  jobId: string;
  initialSaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/research/${jobId}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: !saved }),
      });
      if (!response.ok) {
        setError(await describeFailure(response, "The research run could not be saved"));
        return;
      }
      const payload = await response.json();
      setSaved(Boolean(payload.saved));
      router.refresh();
    } catch {
      setError("The research run could not be saved. Check that the server is running.");
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border-[3px] px-2.5 text-xs font-semibold transition-colors disabled:opacity-60",
          saved
            ? "border-good-500/40 bg-mint text-ink hover:bg-good-100"
            : "border-[3px] border-ink bg-paper-2 text-ink/70 hover:border-ink hover:text-punch",
        )}
        title={saved ? "Remove from saved research" : "Save this research run"}
      >
        {pending ? <Spinner className="h-3 w-3" /> : <span aria-hidden>{saved ? "★" : "☆"}</span>}
        {saved ? "Saved" : "Save"}
      </button>
      {error ? <span className="text-xs font-medium text-bad-500">{error}</span> : null}
    </span>
  );
}

export function SaveProjectButton({
  projectId,
  initialSaved,
}: {
  projectId: string;
  initialSaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, saved: !saved }),
      });
      if (!response.ok) {
        setError(await describeFailure(response, "The project could not be saved"));
        return;
      }
      const payload = await response.json();
      setSaved(Boolean(payload.saved));
      router.refresh();
    } catch {
      setError("The project could not be saved. Check that the server is running.");
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-lg border-[3px] px-3 text-sm font-semibold transition-colors disabled:opacity-60",
          saved
            ? "border-good-500/40 bg-mint text-ink"
            : "border-[3px] border-ink bg-paper-2 text-ink/80 hover:border-ink hover:text-punch",
        )}
      >
        {pending ? <Spinner className="h-3 w-3" /> : <span aria-hidden>{saved ? "★" : "☆"}</span>}
        {saved ? "Saved" : "Save project"}
      </button>
      {error ? <span className="text-xs font-medium text-bad-500">{error}</span> : null}
    </span>
  );
}
