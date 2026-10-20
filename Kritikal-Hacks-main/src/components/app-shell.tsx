"use client";

/**
 * The application shell: header, navigation, demo-mode banner and footer.
 *
 * Neo Brutalist: a hard ink bar, square blocks, a marquee-style notice
 * strip. The banner is driven by the provider status returned from the
 * server, so a demo run is never mistaken for live research.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/discover", label: "Find an idea", always: true },
  { href: "/research", label: "Research", always: true },
  { href: "/projects", label: "Projects", always: true },
  { href: "/compare", label: "Compare", always: false },
  { href: "/report", label: "Market gaps", always: false },
  { href: "/ideas", label: "Idea Studio", always: false },
  { href: "/pitch", label: "Pitch Studio", always: false },
  { href: "/saved", label: "Saved", always: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [demoMode, setDemoMode] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => {
        if (active) setDemoMode(Boolean(data.demoMode));
      })
      .catch(() => {
        if (active) setDemoMode(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {demoMode ? (
        <div className="border-[3px] flex items-center justify-center gap-2 border-b-[3px] border-ink bg-acid px-4 py-2 text-center text-xs font-black uppercase tracking-widest text-ink">
          <span className="hidden sm:inline">Demo mode</span>
          <span className="sm:hidden">Demo</span>
          <span className="font-medium normal-case tracking-normal">
            — no provider credentials, so bundled sample data is used. Not live research.
          </span>
        </div>
      ) : null}

      <header className="border-[3px] sticky top-0 z-30 border-b-[3px] border-ink bg-paper-2">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center border-[3px] border-ink bg-ink text-sm font-black text-acid shadow-[3px_3px_0_0_#d7ff3e]">
              PS
            </span>
            <span className="hidden text-lg font-black uppercase tracking-tight sm:block">
              ProjectScope
            </span>
          </Link>

          <nav className="ml-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap border-[3px] px-2.5 py-1.5 text-xs font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5",
                    item.always ? "inline-block" : "hidden lg:inline-block",
                    active
                      ? "border-[3px] border-ink bg-ink text-paper-2"
                      : "border-transparent text-ink/70 hover:border-ink hover:bg-acid",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/discover"
            className="brutal-btn hidden shrink-0 bg-punch text-ink sm:inline-flex"
          >
            ★ Find an idea
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-[3px] border-t-[3px] border-ink bg-ink text-paper-2">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="brutal-label text-acid">Honest by default</p>
              <p className="mt-2 text-sm font-medium text-paper-2/80">
                ProjectScope stores short summaries, factual metadata, attribution, source URLs and
                retrieval timestamps. It never republishes a third-party submission, and it never
                claims coverage it does not have.
              </p>
            </div>
            <div>
              <p className="brutal-label text-sky">Source rules</p>
              <p className="mt-2 text-sm font-medium text-paper-2/80">
                Devpost: metadata only, never scraped. Unstop: robots.txt respected, no bypasses.
                Hacker News: public API. We never defeat a login, a CAPTCHA or a rate limit.
              </p>
            </div>
            <div>
              <p className="brutal-label text-punch">Your work</p>
              <p className="mt-2 text-sm font-medium text-paper-2/80">
                AI text is a starting point, not evidence. Describe your own implementation, tests
                and results truthfully.
              </p>
            </div>
          </div>
          <div className="mt-8 border-t-2 border-paper-2/20 pt-4 text-xs font-bold uppercase tracking-widest text-paper-2/50">
            ProjectScope — hackathon project intelligence
          </div>
        </div>
      </footer>
    </>
  );
}
