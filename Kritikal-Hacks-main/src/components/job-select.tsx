"use client";

/**
 * A small dropdown that links to another research run.
 *
 * It keeps the current path and swaps the `jobId` query parameter, so the
 * user can move between runs without losing the page they are on.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function JobSelect({
  jobs,
  currentJobId,
  label = "Research run",
}: {
  jobs: Array<{ id: string; topic: string; isDemo: boolean }>;
  currentJobId?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (jobs.length === 0) return null;

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("jobId", value);
    else params.delete("jobId");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink/60">{label}</span>
      <select
        value={currentJobId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 max-w-sm rounded-lg border-[3px] border-ink bg-paper-2 px-2 text-sm shadow-sm focus:border-ink focus:outline-none"
      >
        <option value="">Select a run…</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.topic}
            {job.isDemo ? " (demo)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
