"use client";

/**
 * Export the research report as Markdown or JSON.
 *
 * The download is produced by POST /api/export, so the browser gets a real
 * file rather than a page navigation.
 */
import { useState } from "react";

import { Alert, Button, Spinner } from "@/components/ui";

export function ExportButtons({ jobId }: { jobId: string }) {
  const [pending, setPending] = useState<"markdown" | "json" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (format: "markdown" | "json") => {
    setPending(format);
    setError(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, format }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? "The export failed.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = match?.[1] ?? `projectscope-report.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("The export failed. Check that the server is running.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          tone="paper"
          onClick={() => download("markdown")}
          disabled={pending !== null}
        >
          {pending === "markdown" ? <Spinner /> : null}
          Export Markdown
        </Button>
        <Button tone="paper" onClick={() => download("json")} disabled={pending !== null}>
          {pending === "json" ? <Spinner /> : null}
          Export JSON
        </Button>
      </div>
      {error ? (
        <Alert tone="bad" className="mt-2">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
