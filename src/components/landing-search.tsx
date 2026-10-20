"use client";

/**
 * The landing-page search box.
 *
 * It only navigates — the actual research run happens on the server through
 * POST /api/research.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/components/ui";

const EXAMPLES = [
  "AI study tools for first-year students",
  "Offline health tools for rural clinics",
  "Assistive technology for low-vision users",
  "Carbon accounting for small retailers",
];

export function LandingSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const topic = value.trim();
    if (!topic) return;
    router.push(`/research?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="landing-query" className="sr-only">
          Your hackathon theme, problem statement or idea
        </label>
        <Input
          id="landing-query"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. AI study tools for first-year students"
          className="text-base"
          autoComplete="off"
        />
        <Button type="submit" tone="ink" className="shrink-0 bg-ink text-paper-2">
          Start research →
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="brutal-label text-ink/50">Try</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setValue(example)}
            className="brutal-tag hover:bg-acid"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
