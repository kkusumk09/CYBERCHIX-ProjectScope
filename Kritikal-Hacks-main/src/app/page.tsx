import Link from "next/link";
import type { Metadata } from "next";

import { LandingSearch } from "@/components/landing-search";
import { Tag } from "@/components/ui";

export const metadata: Metadata = {
  title: "Find the gap nobody filled",
  description:
    "ProjectScope researches existing hackathon projects and past winners, spots the gaps, helps you design a genuinely differentiated project.",
};

const STEPS = [
  {
    n: "01",
    title: "You bring nothing",
    body: "No problem statement? Fine. Press the button. Optionally add interests, tech you know, team size or constraints — all of them optional.",
    tone: "bg-acid" as const,
  },
  {
    n: "02",
    title: "We dig up the evidence",
    body: "TinyFish searches the permitted sources for past winners, existing projects, emerging tech and real-world problems. Devpost is metadata-only — its ToS forbid scraping.",
    tone: "bg-sky" as const,
  },
  {
    n: "03",
    title: "We read what is broken",
    body: "OpenAI normalises every record into the same shape. Gemini finds recurring patterns, weaknesses and users nobody is serving.",
    tone: "bg-mint" as const,
  },
  {
    n: "04",
    title: "We propose the problems",
    body: "Five concepts, five different domains. Each scored on feasibility, originality, impact, ambition and demo potential — every score justified with evidence.",
    tone: "bg-punch" as const,
  },
  {
    n: "05",
    title: "You get a buildable plan",
    body: "A full proposal: abstract, problem, users, features, stack, architecture, a phased roadmap, validation plan and the pitch slides.",
    tone: "bg-tangerine" as const,
  },
];

const GUARANTEES = [
  "Shows the number of records actually found and the sources actually checked — never a claim of comprehensive coverage.",
  "Stores short summaries, factual metadata, attribution, source URLs and retrieval timestamps instead of republishing submissions.",
  "Flags high-similarity ideas, shows what is already common, and never claims a project novel just because an AI wrote it.",
  "Separates evidence from hypothesis everywhere, so you can see exactly what is backed by a link.",
  "Never invents statistics, interviews, awards, citations or competitor features — and tells you what is still unvalidated.",
];

export default function LandingPage() {
  return (
    <div>
      {/* ================= HERO ================= */}
      <section className="border-[3px] border-b-[3px] border-ink bg-paper-2">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
            <div className="brutal-in">
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="ink">Hackathon project intelligence</Tag>
                <Tag tone="punch">No problem statement needed</Tag>
              </div>

              <h1 className="brutal-display mt-6 text-5xl text-ink sm:text-6xl lg:text-7xl">
                Find the gap
                <br />
                nobody filled
                <br />
                <span className="bg-ink px-2 text-acid">before you build it</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg font-medium text-ink/75">
                ProjectScope researches the projects and past winners that already exist for your
                idea, shows you what they all have in common, finds the users nobody is serving,
                and designs a genuinely differentiated project — with every factual claim linked
                back to its source.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/discover"
                  className="brutal-btn bg-punch text-ink shadow-[8px_8px_0_0_#0a0a0a] text-base"
                >
                  ★ Find Me a Winning Project Idea
                </Link>
                <Link
                  href="/research"
                  className="brutal-btn bg-paper-2 text-ink"
                >
                  I already have a topic →
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-black uppercase tracking-widest text-ink/60">
                <span>TinyFish · discovery</span>
                <span>OpenAI · normalisation</span>
                <span>Gemini · gap analysis</span>
              </div>
            </div>

            {/* Poster panel */}
            <div className="brutal-in relative">
              <div className="border-[3px] border-ink bg-acid p-5 shadow-[10px_10px_0_0_#0a0a0a]">
                <p className="brutal-label">What you get</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "5 concepts in 5 different domains",
                    "Ranked + scored on 5 axes, each justified",
                    "1 recommended idea with its evidence",
                    "A complete project proposal",
                    "Source links on every factual claim",
                    "Similarity warnings when you copy",
                  ].map((item, index) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center border-[3px] border-ink bg-ink text-[10px] font-black text-acid">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 font-black">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 border-[3px] border-ink bg-ink p-4 text-paper-2 shadow-[6px_6px_0_0_#ff4f9a]">
                <p className="brutal-label text-punch">Honest by default</p>
                <p className="mt-2 text-sm font-medium">
                  We never claim a project is novel just because an AI wrote it. High-similarity
                  ideas get flagged, and everything unvalidated gets labelled.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TICKER ================= */}
      <div className="border-[3px] overflow-hidden border-b-[3px] border-ink bg-ink py-2">
        <div className="brutal-mono flex whitespace-nowrap text-xs uppercase tracking-[0.2em] text-acid">
          {Array.from({ length: 2 }).map((_, block) => (
            <div key={block} className="flex">
              {[
                "Devpost: metadata only — never scraped",
                "Unstop: robots.txt respected",
                "No CAPTCHA bypass",
                "No rate-limit evasion",
                "Every claim linked",
                "Evidence vs hypothesis, always",
                "Awards only when a source states them",
                "Coverage never overstated",
              ].map((item) => (
                <span key={`${block}-${item}`} className="px-6">
                  ■ {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ================= SEARCH ================= */}
      <section className="border-[3px] border-b-[3px] border-ink bg-paper">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="brutal-label text-punch">Or start from a specific topic</p>
          <h2 className="brutal-display mt-2 text-3xl text-ink sm:text-4xl">
            Already have an idea? Start there.
          </h2>
          <div className="mt-6 max-w-3xl">
            <LandingSearch />
          </div>
        </div>
      </section>

      {/* ================= STEPS ================= */}
      <section className="border-[3px] border-b-[3px] border-ink bg-paper-2">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="brutal-label text-punch">The pipeline</p>
          <h2 className="brutal-display mt-2 text-4xl text-ink sm:text-5xl">
            How it actually works
          </h2>
          <p className="mt-4 max-w-2xl text-ink/70">
            Every stage keeps the evidence trail intact, and every stage can fail on its own without
            losing what you already have.
          </p>

          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step) => (
              <li key={step.n} className="brutal-card flex h-full flex-col">
                <div className={`${step.tone} border-b-[3px] border-ink px-4 py-3`}>
                  <span className="brutal-display text-3xl">{step.n}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="brutal-display text-lg leading-tight text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm font-medium text-ink/70">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= GUARANTEES ================= */}
      <section className="border-[3px] border-b-[3px] border-ink bg-ink text-paper-2">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Tag tone="punch">Built to be honest</Tag>
            <h2 className="brutal-display mt-5 text-4xl text-paper-2 sm:text-5xl">
              Research that does not overstate what it knows
            </h2>
            <p className="mt-5 text-ink-inverse/80 font-medium text-paper-2/75">
              Most AI research tools blur the line between what a source says and what a model
              guessed. ProjectScope keeps that line visible.
            </p>
            <div className="mt-8">
              <Link href="/discover" className="brutal-btn bg-acid text-ink">
                ★ Find Me a Winning Project Idea
              </Link>
            </div>
          </div>

          <ul className="space-y-3">
            {GUARANTEES.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 border-[3px] border-paper-2/25 bg-paper-2/5 px-4 py-3 text-sm font-medium"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center border-2 border-acid text-[10px] font-black text-acid">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= SOURCE RULES ================= */}
      <section className="bg-paper">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="brutal-label text-punch">Source rules we do not bend</p>
          <h2 className="brutal-display mt-2 text-4xl text-ink sm:text-5xl">
            Discovery is easy to automate in ways that break a site&apos;s terms
          </h2>
          <p className="mt-4 max-w-3xl text-ink/70">
            ProjectScope encodes the limits in code instead of hiding them.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                name: "Devpost",
                rule: "Metadata only",
                body: "Devpost's Terms of Service prohibit scraping and crawling, so we never fetch a Devpost project page — not even when you paste the URL. You get title, snippet link search engine already exposed, plus manual import option.",
                tone: "bg-punch" as const,
              },
              {
                name: "Unstop",
                rule: "Robots-aware",
                body: "Unstop's robots.txt allows /competitions/ and /hackathons/ — including for AI crawlers — and disallows /u/, /p/, /api/ and registration. We honour that. No login bypass, no CAPTCHA solving, no rate-limit evasion.",
                tone: "bg-sky" as const,
              },
              {
                name: "Hacker News",
                rule: "Public API",
                body: "Hacker News exposes a public search API intended for programmatic use. We use it discovery only and always link back to the original thread.",
                tone: "bg-mint" as const,
              },
            ].map((source) => (
              <div key={source.name} className="brutal-card">
                <div className={`${source.tone} border-b-[3px] border-ink px-4 py-3`}>
                  <p className="brutal-display text-xl">{source.name}</p>
                  <p className="brutal-label mt-1">{source.rule}</p>
                </div>
                <p className="p-4 text-sm font-medium text-ink/70">{source.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
