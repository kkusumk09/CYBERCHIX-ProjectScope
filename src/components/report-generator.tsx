"use client";

/**
 * Market-gap report generator.
 *
 * The `focus` field is forwarded to the analysis model, so it lets the user
 * steer the analysis instead of always getting the same generic report. It
 * was previously accepted by the API but never set by the interface.
 */
import { useState } from "react";

import { GenerateButton } from "@/components/generate-button";
import { Card, CardBody, CardHeader, Field, Input } from "@/components/ui";

export function ReportGenerator({
  jobId,
  label,
  pendingLabel = "Analysing…",
}: {
  jobId: string;
  label: string;
  pendingLabel?: string;
}) {
  const [focus, setFocus] = useState("");

  return (
    <Card>
      <CardHeader
        title="Steer the analysis"
        description="Optionally tell the analyser what to look for. It is passed to the model along with the collected records."
      />
      <CardBody className="space-y-4">
        <Field
          label="Extra focus (optional)"
          htmlFor="analysis-focus"
          hint="For example: only look at low-connectivity users, or only healthcare projects."
        >
          <Input
            id="analysis-focus"
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            placeholder="Focus on offline-first tools for low-connectivity users"
            maxLength={1000}
          />
        </Field>

        <GenerateButton
          endpoint="/api/analysis"
          body={{ jobId, focus }}
          label={label}
          pendingLabel={pendingLabel}
        />
      </CardBody>
    </Card>
  );
}
