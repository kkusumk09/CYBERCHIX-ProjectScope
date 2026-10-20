import { describe, expect, it } from "vitest";

import {
  researchRequestSchema,
  manualImportSchema,
  SOURCE_REGISTRY,
  SOURCE_IDS,
  searchResponseSchema,
  fetchResponseSchema,
} from "@/lib/schema";

describe("research request validation", () => {
  it("accepts a minimal valid request", () => {
    const parsed = researchRequestSchema.parse({ topic: "AI study tools" });
    expect(parsed.topic).toBe("AI study tools");
    expect(parsed.sources).toEqual(["web", "devpost", "unstop", "hackernews"]);
    expect(parsed.resultLimit).toBe(20);
  });

  it("rejects a topic that is too short", () => {
    const result = researchRequestSchema.safeParse({ topic: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown sources", () => {
    const result = researchRequestSchema.safeParse({ topic: "AI study tools", sources: ["nope"] });
    expect(result.success).toBe(false);
  });

  it("clamps an out-of-range result limit", () => {
    expect(researchRequestSchema.safeParse({ topic: "valid topic", resultLimit: 0 }).success).toBe(
      false,
    );
    expect(
      researchRequestSchema.safeParse({ topic: "valid topic", resultLimit: 1000 }).success,
    ).toBe(false);
  });

  it("trims and defaults optional fields", () => {
    const parsed = researchRequestSchema.parse({
      topic: "  spaced topic  ",
      problemStatement: "",
    });
    expect(parsed.topic).toBe("spaced topic");
    expect(parsed.problemStatement).toBe("");
  });
});

describe("manual import validation", () => {
  it("requires at least one entry", () => {
    const result = manualImportSchema.safeParse({ jobId: "abc", sourceId: "devpost", entries: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL source url", () => {
    const result = manualImportSchema.safeParse({
      jobId: "abc",
      sourceId: "devpost",
      entries: [{ title: "A project", url: "not a url" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed entry", () => {
    const result = manualImportSchema.safeParse({
      jobId: "abc",
      sourceId: "devpost",
      entries: [{ title: "A project", url: "https://devpost.com/software/1" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("provider payload validation", () => {
  it("rejects a search response missing required fields", () => {
    const result = searchResponseSchema.safeParse({
      query: "x",
      results: [{ position: 1, site_name: "a", snippet: "b" }],
      total_results: 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid search response", () => {
    const result = searchResponseSchema.safeParse({
      query: "x",
      results: [
        { position: 1, site_name: "a", snippet: "b", title: "t", url: "https://a.example" },
      ],
      total_results: 1,
      page: 0,
    });
    expect(result.success).toBe(true);
  });

  it("defaults the fetch error array", () => {
    const result = fetchResponseSchema.safeParse({ results: [] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.errors).toEqual([]);
  });
});

describe("source registry policy", () => {
  it("never allows automatic page retrieval for Devpost", () => {
    expect(SOURCE_REGISTRY.devpost.allowsPageFetch).toBe(false);
    expect(SOURCE_REGISTRY.devpost.access).toBe("search-metadata");
  });

  it("allows page retrieval for Unstop and Hacker News", () => {
    expect(SOURCE_REGISTRY.unstop.allowsPageFetch).toBe(true);
    expect(SOURCE_REGISTRY.hackernews.allowsPageFetch).toBe(true);
  });

  it("explains the Devpost restriction to the user", () => {
    expect(SOURCE_REGISTRY.devpost.policyNote).toMatch(/Terms of Service/i);
    expect(SOURCE_REGISTRY.devpost.policyNote).toMatch(/never retrieves/i);
  });

  it("registers every declared source id", () => {
    for (const id of SOURCE_IDS) {
      expect(SOURCE_REGISTRY[id]).toBeDefined();
    }
  });
});
