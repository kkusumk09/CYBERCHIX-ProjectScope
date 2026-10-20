import { beforeEach, describe, expect, it, vi } from "vitest";

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }));

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  class FakeOpenAI {
    responses = { parse: parseMock };
  }
  return { ...actual, default: FakeOpenAI };
});

import {
  APIError,
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
} from "openai";

import { resetOpenAiClient, normaliseProjects, clusterProjects, generateConcepts } from "@/lib/providers/openai";

const RAW = [
  {
    title: "Offline study coach",
    url: "https://devpost.com/software/a",
    snippet: "A study assistant that works without a connection.",
    siteName: "devpost.com",
    sourceId: "devpost",
    sourceName: "Devpost",
  },
];

describe("openai normalisation", () => {
  beforeEach(() => {
    resetOpenAiClient();
    parseMock.mockReset();
  });

  it("returns the parsed structured output", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        projects: [
          {
            title: "Offline study coach",
            platform: "Devpost",
            summary: "A study assistant that works without a connection.",
            problemAddressed: "Notes never become a revision plan.",
            proposedSolution: "Generate a plan on device.",
            targetUsers: "Students",
            technologies: ["React"],
            businessModel: "",
            distribution: "",
            award: "",
            awardVerified: false,
            domain: "Education",
            uncertaintyNotes: ["Award status not stated."],
          },
        ],
      },
    });

    const result = await normaliseProjects(RAW);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].awardVerified).toBe(false);
  });

  it("skips the API call when there is nothing to normalise", async () => {
    const result = await normaliseProjects([]);
    expect(result.projects).toEqual([]);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("throws a typed error when the model returns no structured output", async () => {
    parseMock.mockResolvedValue({ output_parsed: null });

    await expect(normaliseProjects(RAW)).rejects.toMatchObject({
      code: "malformed_response",
      provider: "openai",
    });
  });

  it("maps a 401 to invalid_key", async () => {
    parseMock.mockRejectedValue(new AuthenticationError(401, undefined, "bad key", new Headers()));

    await expect(normaliseProjects(RAW)).rejects.toMatchObject({ code: "invalid_key" });
  });

  it("maps a quota error to quota_exceeded", async () => {
    parseMock.mockRejectedValue(
      new RateLimitError(429, undefined, "You exceeded your current quota", new Headers()),
    );

    await expect(normaliseProjects(RAW)).rejects.toMatchObject({ code: "quota_exceeded" });
  });

  it("maps a plain 429 to rate_limited", async () => {
    parseMock.mockRejectedValue(new RateLimitError(429, undefined, "slow down", new Headers()));

    await expect(normaliseProjects(RAW)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("maps a timeout to timeout", async () => {
    parseMock.mockRejectedValue(new APIConnectionTimeoutError({ message: "timed out" }));

    await expect(normaliseProjects(RAW)).rejects.toMatchObject({ code: "timeout" });
  });

  it("does not leak the API key", async () => {
    parseMock.mockRejectedValue(
      new APIError(500, undefined, "boom with test-openai-key", undefined),
    );

    try {
      await normaliseProjects(RAW);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("test-openai-key");
    }
  });
});

describe("openai clustering", () => {
  beforeEach(() => {
    resetOpenAiClient();
    parseMock.mockReset();
  });

  it("returns the clusters it was given", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        clusters: [
          {
            clusterId: "cluster-1",
            label: "Offline first",
            approach: "Works without a connection.",
            memberIndexes: [0],
            repeatedPatterns: ["Offline by default"],
            sharedTargetUsers: [],
            sharedBusinessModels: [],
            sharedDistribution: [],
            evidencedLimitations: [],
          },
        ],
      },
    });

    const result = await clusterProjects([
      {
        title: "a",
        platform: "b",
        summary: "c",
        problemAddressed: "",
        proposedSolution: "",
        targetUsers: "",
        technologies: [],
        businessModel: "",
        distribution: "",
        award: "",
        awardVerified: false,
        domain: "",
        uncertaintyNotes: [],
      },
    ]);

    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].clusterId).toBe("cluster-1");
  });
});

describe("openai concept generation", () => {
  beforeEach(() => {
    resetOpenAiClient();
    parseMock.mockReset();
  });

  it("passes the existing projects to the model so it can compare against them", async () => {
    parseMock.mockResolvedValue({
      output_parsed: { concepts: [], commonGround: [], unvalidated: [] },
    });

    await generateConcepts({
      constraints: "48 hours, web only",
      existingProjects: [
        {
          title: "Offline study coach",
          platform: "Devpost",
          url: "https://devpost.com/software/a",
          summary: "s",
          problemAddressed: "p",
          proposedSolution: "s",
          targetUsers: "u",
          technologies: [],
        },
      ],
      gaps: [{ id: "gap-1", title: "Offline gap", observation: "o" }],
    });

    const userMessage = parseMock.mock.calls[0][0].input.find(
      (item: { role: string }) => item.role === "user",
    );
    expect(userMessage.content).toContain("Offline study coach");
    expect(userMessage.content).toContain("48 hours, web only");
  });
});
