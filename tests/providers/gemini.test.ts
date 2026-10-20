import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  class FakeGoogleGenAI {
    interactions = { create: createMock };
  }
  return { ...actual, GoogleGenAI: FakeGoogleGenAI };
});

import { resetGeminiClient, generateMarketGapReport } from "@/lib/providers/gemini";

const EVIDENCE = [
  {
    title: "Offline study coach",
    platform: "Devpost",
    url: "https://devpost.com/software/a",
    summary: "A study assistant that works without a connection.",
    problemAddressed: "Notes never become a revision plan.",
    proposedSolution: "Generate a plan on device.",
    targetUsers: "Students",
    technologies: ["React"],
    sourceName: "Devpost",
  },
];

const VALID_REPORT = {
  summary: "A summary.",
  gaps: [
    {
      id: "gap-1",
      title: "A gap",
      observation: "An observation.",
      supportingEvidence: ["Something the source said."],
      sourceUrls: ["https://devpost.com/software/a"],
      confidence: "medium",
      assumptions: ["An assumption."],
      affectedUsers: ["Students"],
      proposedImprovement: "Do it offline.",
      potentialBusinessValue: "Unclear.",
      validationExperiment: "Run three sessions.",
      claimType: "evidence",
    },
  ],
  patterns: [],
  competitors: [],
  assumptions: [],
  experiments: [],
  sources: [],
  coverageNote: "1 record analysed.",
};

describe("gemini market-gap report", () => {
  beforeEach(() => {
    resetGeminiClient();
    createMock.mockReset();
  });

  it("requests a JSON schema response and returns the validated report", async () => {
    createMock.mockResolvedValue({
      output_text: JSON.stringify(VALID_REPORT),
      steps: [],
      status: "completed",
    });

    const { report, usedSearchGrounding } = await generateMarketGapReport({
      topic: "offline ai",
      problemStatement: "",
      domain: "",
      targetUsers: "",
      geography: "",
      evidence: EVIDENCE,
      focus: "",
      useSearchGrounding: false,
    });

    expect(report.gaps).toHaveLength(1);
    expect(report.gaps[0].confidence).toBe("medium");
    expect(usedSearchGrounding).toBe(false);

    const params = createMock.mock.calls[0][0];
    expect(params.response_format.mime_type).toBe("application/json");
    expect(params.response_format.schema.properties.gaps).toBeDefined();
    expect(params.store).toBe(false);
  });

  it("enables the google_search tool when grounding is allowed", async () => {
    createMock.mockResolvedValue({
      output_text: JSON.stringify(VALID_REPORT),
      steps: [],
      status: "completed",
    });

    const { usedSearchGrounding } = await generateMarketGapReport({
      topic: "offline ai",
      problemStatement: "",
      domain: "",
      targetUsers: "",
      geography: "",
      evidence: EVIDENCE,
      focus: "",
      useSearchGrounding: true,
    });

    expect(usedSearchGrounding).toBe(true);
    expect(createMock.mock.calls[0][0].tools).toEqual([{ type: "google_search" }]);
  });

  it("collects url citations from the grounded steps", async () => {
    createMock.mockResolvedValue({
      output_text: JSON.stringify(VALID_REPORT),
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [
            {
              type: "text",
              text: "Some grounded text",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://example.com/article",
                  title: "An article",
                  start_index: 0,
                  end_index: 4,
                },
              ],
            },
          ],
        },
      ],
    });

    const { citations } = await generateMarketGapReport({
      topic: "offline ai",
      problemStatement: "",
      domain: "",
      targetUsers: "",
      geography: "",
      evidence: EVIDENCE,
      focus: "",
      useSearchGrounding: true,
    });

    expect(citations).toHaveLength(1);
    expect(citations[0].url).toBe("https://example.com/article");
    expect(citations[0].source).toBe("example.com");
  });

  it("falls back to evidence-only analysis when grounding is unavailable", async () => {
    createMock
      .mockRejectedValueOnce(Object.assign(new Error("tool unsupported"), { status: 400 }))
      .mockResolvedValueOnce({
        output_text: JSON.stringify(VALID_REPORT),
        steps: [],
        status: "completed",
      });

    const { usedSearchGrounding } = await generateMarketGapReport({
      topic: "offline ai",
      problemStatement: "",
      domain: "",
      targetUsers: "",
      geography: "",
      evidence: EVIDENCE,
      focus: "",
      useSearchGrounding: true,
    });

    expect(usedSearchGrounding).toBe(false);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("rejects output that is not valid JSON", async () => {
    createMock.mockResolvedValue({ output_text: "not json", steps: [] });

    await expect(
      generateMarketGapReport({
        topic: "t",
        problemStatement: "",
        domain: "",
        targetUsers: "",
        geography: "",
        evidence: EVIDENCE,
        focus: "",
        useSearchGrounding: false,
      }),
    ).rejects.toMatchObject({ code: "malformed_response" });
  });

  it("rejects output that does not match the schema", async () => {
    createMock.mockResolvedValue({
      output_text: JSON.stringify({ summary: "only a summary" }),
      steps: [],
    });

    await expect(
      generateMarketGapReport({
        topic: "t",
        problemStatement: "",
        domain: "",
        targetUsers: "",
        geography: "",
        evidence: EVIDENCE,
        focus: "",
        useSearchGrounding: false,
      }),
    ).rejects.toMatchObject({ code: "malformed_response" });
  });

  it("does not leak the API key when the provider errors", async () => {
    createMock.mockRejectedValue(
      Object.assign(new Error("failed with test-gemini-key"), { status: 500 }),
    );

    try {
      await generateMarketGapReport({
        topic: "t",
        problemStatement: "",
        domain: "",
        targetUsers: "",
        geography: "",
        evidence: EVIDENCE,
        focus: "",
        useSearchGrounding: false,
      });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("test-gemini-key");
    }
  });
});
