import { describe, expect, it } from "vitest";

import { buildQueryPlan, fetchBlockedReason, platformForUrl, sourceInfo } from "@/lib/research/sources";
import { normaliseUrl, truncate, hostFromUrl } from "@/lib/utils";

describe("query plan", () => {
  const context = {
    topic: "offline AI tools",
    problemStatement: "Features break without a connection",
    domain: "Education",
    targetUsers: "rural students",
    geography: "India",
  };

  it("builds a projects and a winners query per source", () => {
    const plan = buildQueryPlan(["devpost", "unstop"], context);
    const devpost = plan.filter((item) => item.sourceId === "devpost");
    expect(devpost).toHaveLength(2);
    expect(devpost.map((item) => item.kind)).toEqual(["projects", "winners"]);
  });

  it("restricts Devpost to its own domain", () => {
    const plan = buildQueryPlan(["devpost"], context);
    for (const item of plan) {
      expect(item.includeDomains).toEqual(["devpost.com"]);
    }
  });

  it("leaves the open web unrestricted", () => {
    const plan = buildQueryPlan(["web"], context);
    expect(plan[0].includeDomains).toEqual([]);
  });

  it("adds a geography-scoped pass when a geography is supplied", () => {
    const withoutGeo = buildQueryPlan(["web"], { ...context, geography: "" });
    const withGeo = buildQueryPlan(["web"], context);
    expect(withGeo.length).toBe(withoutGeo.length + 1);
    expect(withGeo.at(-1)?.query).toContain("India");
  });

  it("never puts the problem statement in full into a query", () => {
    const plan = buildQueryPlan(["web"], context);
    // The query is a keyword string, so it stays short and readable.
    for (const item of plan) {
      expect(item.query.length).toBeLessThan(220);
    }
  });
});

describe("retrieval policy", () => {
  it("blocks Devpost page retrieval with an explanation", () => {
    const reason = fetchBlockedReason("https://devpost.com/software/my-project");
    expect(reason).toBeTruthy();
    expect(reason).toMatch(/Terms of Service/i);
  });

  it("blocks Unstop paths that robots.txt disallows", () => {
    expect(fetchBlockedReason("https://unstop.com/u/some-profile")).toBeTruthy();
    expect(fetchBlockedReason("https://unstop.com/p/some-project")).toBeTruthy();
    expect(fetchBlockedReason("https://unstop.com/api/public/thing")).toBeTruthy();
  });

  it("allows Unstop competition pages", () => {
    expect(fetchBlockedReason("https://unstop.com/competitions/xyz")).toBeNull();
  });

  it("allows ordinary web pages", () => {
    expect(fetchBlockedReason("https://example.com/some/project")).toBeNull();
  });
});

describe("source lookup", () => {
  it("returns the registry entry for a known source", () => {
    expect(sourceInfo("devpost").name).toBe("Devpost");
  });

  it("falls back to a safe manual-only entry for an unknown source", () => {
    const info = sourceInfo("demo");
    expect(info.access).toBe("manual-only");
    expect(info.allowsPageFetch).toBe(false);
  });
});

describe("url helpers", () => {
  it("normalises urls for deduplication", () => {
    expect(normaliseUrl("https://www.Devpost.com/software/x/")).toBe("devpost.com/software/x");
    expect(normaliseUrl("https://devpost.com/software/x?utm=1")).toBe(
      "devpost.com/software/x",
    );
  });

  it("treats different paths as different urls", () => {
    expect(normaliseUrl("https://devpost.com/a")).not.toBe(normaliseUrl("https://devpost.com/b"));
  });

  it("maps hosts to friendly platform names", () => {
    expect(platformForUrl("https://devpost.com/software/x")).toBe("Devpost");
    expect(platformForUrl("https://unstop.com/p/x")).toBe("Unstop");
    expect(platformForUrl("https://news.ycombinator.com/item?id=1")).toBe("Hacker News");
  });

  it("extracts the host", () => {
    expect(hostFromUrl("https://www.example.com/a/b")).toBe("example.com");
  });

  it("truncates on a word boundary", () => {
    const text = "the quick brown fox jumps over the lazy dog";
    const short = truncate(text, 20);
    expect(short.length).toBeLessThanOrEqual(21);
    expect(short.endsWith("…")).toBe(true);
  });
});
