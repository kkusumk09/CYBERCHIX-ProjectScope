import "server-only";

/**
 * Source policy + query construction.
 *
 * The rules encoded here are the difference between a useful research tool and
 * a Terms-of-Service violation, so they live in one place and are easy to
 * audit.
 *
 * Devpost  : its Terms of Service prohibit scraping and crawling. We use the
 *            TinyFish Search API (which returns titles/snippets/URLs that a
 *            search engine already exposes) and we never fetch a Devpost
 *            project page — not even when the user pastes the URL.
 * Unstop    : robots.txt allows /competitions/ and /hackathons/ and explicitly
 *            allows AI crawlers, while disallowing /u/, /p/, /api/ and
 *            registration. We honour that and never attempt a login, a
 *            CAPTCHA, or an access control.
 * HN        : the public Algolia search API is intended for programmatic use.
 * Web       : general discovery, with the same respectful limits.
 */
import { SOURCE_REGISTRY, type SourceId } from "@/lib/schema";
import { hostFromUrl } from "@/lib/utils";

export { SOURCE_REGISTRY };
export type { SourceId };

export interface SourceInfo {
  id: string;
  name: string;
  homepage: string;
  access: "search-metadata" | "fetch-page" | "manual-only";
  includeDomains: string[];
  allowsPageFetch: boolean;
  policyNote: string;
  allowsManualImport: boolean;
}

/**
 * Look a source up by id. Ids that are not in the registry (for example the
 * built-in demo dataset) fall back to a safe, manual-only description.
 */
export function sourceInfo(sourceId: string): SourceInfo {
  const found = SOURCE_REGISTRY[sourceId as SourceId];
  if (found) return found;
  return {
    id: sourceId,
    name: sourceId,
    homepage: "",
    access: "manual-only",
    includeDomains: [],
    allowsPageFetch: false,
    allowsManualImport: true,
    policyNote: "Records supplied by the user or by the built-in demo dataset.",
  };
}

/** Human-friendly platform name for a given host. */
export function platformForUrl(url: string): string {
  const host = hostFromUrl(url);
  if (host.endsWith("devpost.com")) return "Devpost";
  if (host.endsWith("unstop.com")) return "Unstop";
  if (host.endsWith("ycombinator.com")) return "Hacker News";
  if (host.endsWith("algolia.com")) return "Hacker News (Algolia)";
  if (host.endsWith("github.com")) return "GitHub";
  if (host.endsWith("medium.com")) return "Medium";
  if (host.endsWith("dev.to")) return "DEV Community";
  if (host.endsWith("reddit.com")) return "Reddit";
  if (host.endsWith("linkedin.com")) return "LinkedIn";
  if (host.endsWith("youtube.com")) return "YouTube";
  if (host.endsWith("producthunt.com")) return "Product Hunt";
  if (host.endsWith("itch.io")) return "itch.io";
  return host || "Unknown";
}

export interface QueryPlan {
  sourceId: SourceId;
  sourceName: string;
  query: string;
  purpose: string;
  includeDomains: string[];
  /** "winners" = awards/rankings, "projects" = general work, "open" = exploratory. */
  kind: "projects" | "winners" | "open";
}

export interface QueryContext {
  topic: string;
  problemStatement: string;
  domain: string;
  targetUsers: string;
  geography: string;
}

/** Build the list of searches we will run for the selected sources. */
export function buildQueryPlan(sourceIds: SourceId[], context: QueryContext): QueryPlan[] {
  const topic = context.topic.trim();
  const problem = context.problemStatement.trim();
  const domain = context.domain.trim();
  const audience = context.targetUsers.trim();
  const geography = context.geography.trim();

  const descriptors = [topic, problem, domain].filter(Boolean).join(" ");
  const audienceClause = audience ? ` for ${audience}` : "";

  const plan: QueryPlan[] = [];

  for (const sourceId of sourceIds) {
    const source = SOURCE_REGISTRY[sourceId];

    plan.push({
      sourceId,
      sourceName: source.name,
      query: `${descriptors}${audienceClause} hackathon project`.replace(/\s+/g, " ").trim(),
      purpose: `Find existing hackathon projects about: ${topic}`,
      includeDomains: source.includeDomains,
      kind: "projects",
    });

    plan.push({
      sourceId,
      sourceName: source.name,
      query: `${topic} hackathon winner winning project${domain ? ` ${domain}` : ""}`
        .replace(/\s+/g, " ")
        .trim(),
      purpose: `Find past hackathon winners and awarded projects about: ${topic}`,
      includeDomains: source.includeDomains,
      kind: "winners",
    });
  }

  if (geography && sourceIds.includes("web")) {
    // A geography-scoped pass across the open web. Only added when the user
    // actually selected the open web as a source.
    plan.push({
      sourceId: "web",
      sourceName: SOURCE_REGISTRY.web.name,
      query: `${descriptors} ${geography} hackathon project`.replace(/\s+/g, " ").trim(),
      purpose: `Find hackathon projects in ${geography} about: ${topic}`,
      includeDomains: [],
      kind: "projects",
    });
  }

  return plan;
}

/** URLs we are not allowed to retrieve automatically, with the reason. */
export function fetchBlockedReason(url: string): string | null {
  const host = hostFromUrl(url);
  if (host.endsWith("devpost.com")) {
    return "Devpost's Terms of Service prohibit scraping and crawling. ProjectScope only shows " +
      "the search-result metadata and the original link.";
  }
  if (host.endsWith("unstop.com") && /\/(u|p|pf|api)\//i.test(url)) {
    return "Unstop's robots.txt disallows this path for automated retrieval.";
  }
  return null;
}
