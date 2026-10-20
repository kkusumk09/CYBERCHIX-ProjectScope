"use client";

/**
 * Manual import.
 *
 * Some sources cannot be retrieved automatically — Devpost's Terms of Service
 * forbid scraping, and only a human can decide which exported file they are
 * entitled to use. This form is that path: the user pastes or pastes in the
 * records, and ProjectScope stores them as `manual-import` with the user's
 * attribution.
 */
import { useState } from "react";

import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { SOURCE_REGISTRY, type SourceId } from "@/lib/schema";

interface Entry {
  title: string;
  url: string;
  platform: string;
  summary: string;
  problemAddressed: string;
  proposedSolution: string;
  targetUsers: string;
  technologies: string;
  award: string;
  attribution: string;
}

const BLANK: Entry = {
  title: "",
  url: "",
  platform: "",
  summary: "",
  problemAddressed: "",
  proposedSolution: "",
  targetUsers: "",
  technologies: "",
  award: "",
  attribution: "",
};

export function ManualImport({ jobId }: { jobId: string }) {
  const [sourceId, setSourceId] = useState<SourceId>("devpost");
  const [entries, setEntries] = useState<Entry[]>([{ ...BLANK }]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const update = (index: number, key: keyof Entry, value: string) => {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry,
      ),
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const payload = entries
      .filter((entry) => entry.title.trim())
      .map((entry) => ({
        title: entry.title,
        url: entry.url,
        platform: entry.platform,
        summary: entry.summary,
        problemAddressed: entry.problemAddressed,
        proposedSolution: entry.proposedSolution,
        targetUsers: entry.targetUsers,
        technologies: entry.technologies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        award: entry.award,
        attribution: entry.attribution,
      }));

    if (payload.length === 0) {
      setMessage({ tone: "bad", text: "Add at least one record with a title." });
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/research/${jobId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, sourceId, entries: payload }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ tone: "bad", text: result?.error?.message ?? "The import failed." });
        return;
      }
      setMessage({
        tone: "good",
        text: `Added ${result.imported} record(s). They are marked as manually imported.`,
      });
      setEntries([{ ...BLANK }]);
    } catch {
      setMessage({ tone: "bad", text: "The import failed. Check that the server is running." });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Add records manually"
        description="For sources ProjectScope is not permitted to retrieve automatically. Use data you exported or are entitled use."
      />
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Source" htmlFor="import-source">
            <Select
              id="import-source"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value as SourceId)}
            >
              {Object.values(SOURCE_REGISTRY).map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </Select>
          </Field>

          <Alert tone="info">{SOURCE_REGISTRY[sourceId].policyNote}</Alert>

          {entries.map((entry, index) => (
            <fieldset
              key={index}
              className="space-y-3 rounded-xl border-[3px] border-ink bg-paper p-4"
            >
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink/60">
                Record {index + 1}
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" htmlFor={`title-${index}`}>
                  <Input
                    id={`title-${index}`}
                    value={entry.title}
                    onChange={(event) => update(index, "title", event.target.value)}
                    placeholder="Project title"
                    required
                  />
                </Field>
                <Field label="Link" htmlFor={`url-${index}`}>
                  <Input
                    id={`url-${index}`}
                    value={entry.url}
                    onChange={(event) => update(index, "url", event.target.value)}
                    placeholder="https://…"
                  />
                </Field>
              </div>

              <Field label="Short summary" htmlFor={`summary-${index}`}>
                <Textarea
                  id={`summary-${index}`}
                  value={entry.summary}
                  onChange={(event) => update(index, "summary", event.target.value)}
                  className="min-h-16"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Problem addressed" htmlFor={`problem-${index}`}>
                  <Input
                    id={`problem-${index}`}
                    value={entry.problemAddressed}
                    onChange={(event) => update(index, "problemAddressed", event.target.value)}
                  />
                </Field>
                <Field label="Proposed solution" htmlFor={`solution-${index}`}>
                  <Input
                    id={`solution-${index}`}
                    value={entry.proposedSolution}
                    onChange={(event) => update(index, "proposedSolution", event.target.value)}
                  />
                </Field>
                <Field label="Target users" htmlFor={`users-${index}`}>
                  <Input
                    id={`users-${index}`}
                    value={entry.targetUsers}
                    onChange={(event) => update(index, "targetUsers", event.target.value)}
                  />
                </Field>
                <Field label="Technologies" htmlFor={`tech-${index}`} hint="Comma separated.">
                  <Input
                    id={`tech-${index}`}
                    value={entry.technologies}
                    onChange={(event) => update(index, "technologies", event.target.value)}
                    placeholder="React, LLM, SQLite"
                  />
                </Field>
                <Field label="Award (only if you can verify it)" htmlFor={`award-${index}`}>
                  <Input
                    id={`award-${index}`}
                    value={entry.award}
                    onChange={(event) => update(index, "award", event.target.value)}
                  />
                </Field>
                <Field label="Attribution" htmlFor={`attr-${index}`} hint="Who owns this work.">
                  <Input
                    id={`attr-${index}`}
                    value={entry.attribution}
                    onChange={(event) => update(index, "attribution", event.target.value)}
                    placeholder="Team name — hackathon name"
                  />
                </Field>
              </div>

              {entries.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setEntries((current) => current.filter((_, i) => i !== index))
                  }
                  className="text-xs font-semibold text-bad hover:underline"
                >
                  Remove this record
                </button>
              ) : null}
            </fieldset>
          ))}

          {message ? (
            <Alert tone={message.tone === "good" ? "good" : "bad"}>{message.text}</Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              tone="paper"
              onClick={() => setEntries((current) => [...current, { ...BLANK }])}
            >
              Add another record
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Importing…" : "Import records"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
