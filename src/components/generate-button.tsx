"use client";

/**
 * Buttons that trigger a server action through the API and then refresh the
 * page so the server component re-reads the stored result.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Spinner } from "@/components/ui";

export function GenerateButton({
  endpoint,
  body,
  label,
  pendingLabel = "Working…",
  className,
}: {
  endpoint: string;
  body: Record<string, unknown>;
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The request failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("The request failed. Check that the server is running.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={className}>
      <Button onClick={run} disabled={pending} tone="paper">
        {pending ? <Spinner /> : null}
        {pending ? pendingLabel : label}
      </Button>
      {error ? (
        <Alert tone="bad" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
