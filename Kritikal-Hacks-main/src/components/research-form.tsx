"use client";

/**
 * Research configuration form.
 *
 * Submits to POST /api/research and then routes to the live research view.
 * The source checkboxes carry their access policy so the user always knows
 * what will and will not be retrieved automatically.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { SOURCE_REGISTRY, type SourceId } from "@/lib/schema";

const SOURCE_ORDER: SourceId[] = ["devpost", "unstop", "hackernews", "web"];

const ACCESS_LABEL: Record<string, string> = {
  "search-metadata": "Search metadata only",
  "fetch-page": "Search + page retrieval",
  "manual-only": "Manual import only",
};

export function ResearchForm({ initialTopic = "" }: { initialTopic?: string }) {
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [problemStatement, setProblemStatement] = useState("");
  const [domain, setDomain] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [geography, setGeography] = useState("");
  const [resultLimit, setResultLimit] = useState(20);
  const [sources, setSources] = useState<SourceId[]>([...SOURCE_ORDER]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSource = (id: SourceId) => {
    setSources((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError("Please enter a topic, problem statement or idea.");
      return;
    }
    if (sources.length === 0) {
      setError("Choose at least one source.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          problemStatement,
          domain,
          targetUsers,
          geography,
          resultLimit,
          sources,
          language: "en",
          location: "US",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The research job could not be started.");
        return;
      }

      router.push(`/research/${payload.job.id}`);
    } catch {
      setError("The research job could not be started. Check that the server is running.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <Alert tone="bad" title="Could not start the research">{error}</Alert> : null}

      <Card>
        <CardHeader
          title="What are you building?"
          description="A theme, a problem statement or rough idea all work. The more specific you are, the better evidence."
        />
        <CardBody className="space-y-5">
          <Field
            label="Topic, problem or idea"
            htmlFor="topic"
            hint="For example: “AI study tools that work without a reliable internet connection”."
          >
            <Input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. AI study tools for first-year students"
              required
              maxLength={300}
            />
          </Field>

          <Field
            label="Problem statement (optional)"
            htmlFor="problem"
            hint="Who has the problem, and what does it cost them today?"
          >
            <Textarea
              id="problem"
              value={problemStatement}
              onChange={(event) => setProblemStatement(event.target.value)}
              placeholder="e.g. First-year students waste weekends deciding what to revise, because lecture notes never turn into a plan."
              maxLength={2000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Domain" htmlFor="domain" hint="e.g. Education, Health">
              <Input
                id="domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="Education"
                maxLength={120}
              />
            </Field>
            <Field label="Target users" htmlFor="users" hint="Who specifically?">
              <Input
                id="users"
                value={targetUsers}
                onChange={(event) => setTargetUsers(event.target.value)}
                placeholder="First-year university students"
                maxLength={500}
              />
            </Field>
            <Field label="Geography" htmlFor="geo" hint="Country or region">
              <Input
                id="geo"
                value={geography}
                onChange={(event) => setGeography(event.target.value)}
                placeholder="India"
                maxLength={120}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Sources"
          description="ProjectScope only checks the sources you select, and retrieves what each source's terms allow."
        />
        <CardBody className="space-y-3">
          {SOURCE_ORDER.map((id) => {
            const source = SOURCE_REGISTRY[id];
            return (
              <div key={id}>
                <Checkbox
                  checked={sources.includes(id)}
                  onChange={() => toggleSource(id)}
                  label={
                    <span className="flex flex-wrap items-center gap-2">
                      {source.name}
                      <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/70">
                        {ACCESS_LABEL[source.access]}
                      </span>
                    </span>
                  }
                  description={source.policyNote}
                />
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Scope" description="How many records should this run collect?" />
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Field label="Maximum results" htmlFor="limit" className="sm:w-48">
            <Select
              id="limit"
              value={String(resultLimit)}
              onChange={(event) => setResultLimit(Number(event.target.value))}
            >
              {[10, 20, 30, 40, 50].map((value) => (
                <option key={value} value={value}>
                  {value} records
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex-1" />

          <Button type="submit" disabled={submitting} className="sm:w-56">
            {submitting ? <Spinner /> : null}
            {submitting ? "Starting…" : "Start research"}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
