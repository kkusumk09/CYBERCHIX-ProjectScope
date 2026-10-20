"use client";

/** Toggle buttons that call a small API endpoint and then refresh the view. */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

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

  const toggle = async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/research/${jobId}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: !saved }),
      });
      if (response.ok) {
        const payload = await response.json();
        setSaved(Boolean(payload.saved));
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  };

  return (
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

  const toggle = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, saved: !saved }),
      });
      if (response.ok) {
        const payload = await response.json();
        setSaved(Boolean(payload.saved));
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  };

  return (
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
  );
}
