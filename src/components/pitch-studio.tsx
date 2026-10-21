"use client";

/**
 * Pitch Studio.
 *
 * The generated pitch is a starting point, not a script to read out loud.
 * The user edits it, and the honesty notes and judge questions are there to
 * make sure the team knows what a judge will push on.
 */
import { useState } from "react";

import { Alert, Tag, Button, Card, CardBody, CardHeader, Field, Spinner, Textarea } from "@/components/ui";

interface PitchContent {
  problem: string;
  targetUser: string;
  solution: string;
  differentiator: string;
  valueProposition: string;
  validationResults: string;
  businessModel: string;
  goToMarket: string;
  demoOutline: string[];
  judgeQuestions: string[];
  attribution: string[];
  honestyNotes: string[];
}

const EMPTY: PitchContent = {
  problem: "",
  targetUser: "",
  solution: "",
  differentiator: "",
  valueProposition: "",
  validationResults: "",
  businessModel: "",
  goToMarket: "",
  demoOutline: [],
  judgeQuestions: [],
  attribution: [],
  honestyNotes: [],
};

export function PitchStudio({
  jobId,
  concepts,
  initialPitch,
}: {
  jobId: string;
  concepts: Array<{ id: string; title: string; tagline: string }>;
  initialPitch: {
    id: string;
    content: PitchContent;
    clarityScore: number | null;
    clarityNotes: string[];
    isDemo: boolean;
  } | null;
}) {
  const [notes, setNotes] = useState("");
  const [extra, setExtra] = useState("");
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? "");
  const [content, setContent] = useState<PitchContent>(initialPitch?.content ?? EMPTY);
  const [clarityScore, setClarityScore] = useState<number | null>(initialPitch?.clarityScore ?? null);
  const [clarityNotes, setClarityNotes] = useState<string[]>(initialPitch?.clarityNotes ?? []);
  const [isDemo, setIsDemo] = useState(initialPitch?.isDemo ?? false);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `notes` is what the user actually built and tested. The model writes
        // the pitch from it — leaving it out would make the field a no-op.
        body: JSON.stringify({ jobId, conceptId, extra, notes }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The pitch could not be generated.");
        return;
      }
      const pitch = payload.pitch ?? payload;
      setContent(pitch.content ?? EMPTY);
      setClarityScore(pitch.clarityScore ?? null);
      setClarityNotes(pitch.clarityNotes ?? []);
      setIsDemo(Boolean(pitch.isDemo));
      setSavedAt(null);
    } catch {
      setError("The pitch could not be generated. Check that the server is running.");
    } finally {
      setPending(false);
    }
  };

  /** Persist the hand-edited pitch so a reload and the export both keep it. */
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/pitch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, content }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "The pitch could not be saved.");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError("The pitch could not be saved. Check that the server is running.");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof PitchContent, value: string) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const updateList = (key: "demoOutline" | "judgeQuestions", value: string) => {
    setContent((current) => ({
      ...current,
      [key]: value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
  };

  const asMarkdown = () =>
    [
      `# Pitch — ${concepts.find((c) => c.id === conceptId)?.title ?? "Project"}`,
      "",
      "## Problem",
      content.problem,
      "",
      "## Target user",
      content.targetUser,
      "",
      "## Solution",
      content.solution,
      "",
      "## Differentiator",
      content.differentiator,
      "",
      "## Value proposition",
      content.valueProposition,
      "",
      "## Validation results",
      content.validationResults,
      "",
      "## Business model",
      content.businessModel,
      "",
      "## Go-to-market",
      content.goToMarket,
      "",
      "## Demo outline",
      ...content.demoOutline.map((item) => `- ${item}`),
      "",
      "## Likely judge questions",
      ...content.judgeQuestions.map((item) => `- ${item}`),
      "",
      "## Inspiration & source attribution",
      ...content.attribution.map((item) => `- ${item}`),
      "",
      "## Honesty notes",
      ...content.honestyNotes.map((item) => `- ${item}`),
    ].join("\n");

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(asMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Your browser blocked the clipboard. Select text and copy it manually.");
    }
  };

  const fields: Array<{ key: keyof PitchContent; label: string; hint?: string; multiline?: boolean }> = [
    { key: "problem", label: "Problem" },
    { key: "targetUser", label: "Target user" },
    { key: "solution", label: "Solution", multiline: true },
    { key: "differentiator", label: "Differentiator", multiline: true },
    { key: "valueProposition", label: "Value proposition" },
    {
      key: "validationResults",
      label: "Validation results",
      hint: "Only experiments you actually ran. If you have run none, say so.",
      multiline: true,
    },
    { key: "businessModel", label: "Business model" },
    { key: "goToMarket", label: "Go-to-market strategy", multiline: true },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="What did you actually build and test?"
          description="The pitch is written from your notes, so it stays true. Be specific and do not inflate."
        />
        <CardBody className="space-y-4">
          {concepts.length > 0 ? (
            <Field label="Concept to pitch" htmlFor="concept">
              <select
                id="concept"
                value={conceptId}
                onChange={(event) => setConceptId(event.target.value)}
                className="h-10 w-full rounded-lg border-[3px] border-ink bg-paper-2 px-3 text-sm shadow-sm"
              >
                <option value="">No concept selected</option>
                {concepts.map((concept) => (
                  <option key={concept.id} value={concept.id}>
                    {concept.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field
            label="Your notes"
            htmlFor="notes"
            hint="What you built, who talked to, what happened, would do next. This is what the model writes from — anything you leave out cannot appear in the pitch."
          >
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="We built an offline triage log. Six health workers tried it; five finished a unaided. have not tested it on real patient."
              maxLength={2000}
            />
          </Field>

          <Field label="Extra instructions (optional)" htmlFor="extra">
            <Textarea
              id="extra"
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
              placeholder="Keep it under 3 minutes. Emphasise the offline behaviour."
              maxLength={2000}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={generate} disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Writing…" : "Write the pitch"}
            </Button>
            {clarityScore !== null ? (
              <Tag tone={clarityScore >= 70 ? "mint" : clarityScore >= 45 ? "acid" : "punch"}>
                clarity {clarityScore}/100
              </Tag>
            ) : null}
          </div>

          {error ? (
            <Alert tone="bad" title="Could not generate the pitch">
              {error}
            </Alert>
          ) : null}

          {isDemo ? (
            <Alert tone="warn" title="Demo mode">
              This pitch was produced without a live model. Replace every placeholder with your real
              implementation, tests and results before you present it.
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Your pitch"
          description="Everything is editable. Change anything that is not true of your project, then save it."
          action={
            savedAt ? <Tag tone="mint">saved {savedAt}</Tag> : null
          }
        />
        <CardBody className="space-y-5">
          {fields.map((field) => (
            <Field key={field.key} label={field.label} htmlFor={`pitch-${field.key}`} hint={field.hint}>
              <Textarea
                id={`pitch-${field.key}`}
                value={content[field.key] as string}
                onChange={(event) => update(field.key, event.target.value)}
                className="min-h-20"
              />
            </Field>
          ))}

          <Field
            label="Demo outline"
            htmlFor="pitch-demo"
            hint="One beat per line. A demo, not a feature list."
          >
            <Textarea
              id="pitch-demo"
              value={content.demoOutline.join("\n")}
              onChange={(event) => updateList("demoOutline", event.target.value)}
            />
          </Field>

          <Field label="Likely judge questions" htmlFor="pitch-questions" hint="One question per line.">
            <Textarea
              id="pitch-questions"
              value={content.judgeQuestions.join("\n")}
              onChange={(event) => updateList("judgeQuestions", event.target.value)}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3 border-t-[3px] border-ink/10 pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner /> : null}
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button tone="paper" onClick={copyMarkdown}>
              {copied ? "Copied" : "Copy as Markdown"}
            </Button>
            <p className="text-xs text-ink/60">
              Saved pitches are what the Markdown and JSON exports contain.
            </p>
          </div>
        </CardBody>
      </Card>

      {clarityNotes.length > 0 ? (
        <Card>
          <CardHeader title="Reviewer notes" description="What to fix before you present." />
          <CardBody>
            <ul className="space-y-2 text-sm text-ink/80">
              {clarityNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="text-warn" aria-hidden>
                    •
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {content.attribution.length > 0 ? (
        <Card>
          <CardHeader
            title="Inspiration & source attribution"
            description="The public projects your idea draws on. These belong to their creators."
          />
          <CardBody>
            <ul className="space-y-1.5 text-sm">
              {content.attribution.map((item) => (
                <li key={item} className="text-ink/80">
                  {item}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {content.honestyNotes.length > 0 ? (
        <Card>
          <CardHeader
            title="Honesty notes"
            description="What a judge could challenge. Fix these rather than hoping they do not come up."
          />
          <CardBody>
            <ul className="space-y-2 text-sm text-ink/80">
              {content.honestyNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="text-bad" aria-hidden>
                    •
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
