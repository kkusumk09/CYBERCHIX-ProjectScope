import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-punch">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
        That page does not exist
      </h1>
      <p className="mt-3 text-ink/70">
        The research run or project you were looking for is not in this database. It may have been
        removed, or the link may be wrong.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/research"
          className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-ink shadow-sm hover:bg-ink-soft"
        >
          Start a research run
        </Link>
        <Link
          href="/saved"
          className="inline-flex h-10 items-center rounded-lg border-[3px] border-ink bg-paper-2 px-4 text-sm font-semibold shadow-sm hover:bg-paper"
        >
          See saved research
        </Link>
      </div>
    </div>
  );
}
