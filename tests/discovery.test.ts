import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { POST as startDiscovery, GET as getDiscovery } from "@/app/api/discover/route";
import { POST as proposalRoute } from "@/app/api/discover/[discoveryId]/proposal/route";
import { buildDiscoveryQueryPlan } from "@/lib/research/discovery";

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function waitForDiscovery(discoveryId: string, timeoutMs = 20_000) {
  const started = Date.now();
  while (true) {
    const response = await getDiscovery(
      new Request(`http://localhost/api/discover?discoveryId=${discoveryId}`),
    );
    const payload = await response.json();
    const status = payload.discovery?.status;
    if (status === "completed" || status === "failed" || status === "cancelled") {
      return payload.discovery;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`The discovery run did not finish in time (status: ${status}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

describe("free-choice discovery (demo mode)", () => {
  let discoveryId = "";

  beforeAll(async () => {
    const response = await startDiscovery(
      post("http://localhost/api/discover", {
        // Every optional input is deliberately blank: the flow must work
        // without the user naming a problem.
        interests: "",
        techPreferences: "",
        teamCapabilities: "",
        constraints: "",
        sources: ["web", "devpost"],
        resultLimit: 10,
        conceptCount: 5,
      }),
    );

    expect(response.status).toBe(202);
    const payload = await response.json();
    discoveryId = payload.discovery.id;
    expect(payload.discovery.isDemo).toBe(true);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("completes without the user naming a problem", async () => {
    const discovery = await waitForDiscovery(discoveryId);
    expect(discovery.status).toBe("completed");
    expect(discovery.resultCount).toBeGreaterThan(0);
  });

  it("produces five concepts in five different domains", async () => {
    const discovery = await waitForDiscovery(discoveryId);
    expect(discovery.concepts).toHaveLength(5);

    const domains = discovery.concepts.map((concept: { domain: string }) => concept.domain);
    expect(new Set(domains).size).toBe(5);
  });

  it("scores every concept on the five axes and totals them correctly", async () => {
    const discovery = await waitForDiscovery(discoveryId);

    for (const concept of discovery.concepts) {
      const scores = concept.scores;
      const sum =
        scores.feasibility +
        scores.originality +
        scores.impact +
        scores.ambition +
        scores.demoPotential;

      expect(sum).toBe(concept.totalScore);
      expect(concept.totalScore).toBeLessThanOrEqual(50);
      expect(concept.totalScore).toBeGreaterThan(0);

      // Every score must be justified.
      for (const axis of [
        "feasibility",
        "originality",
        "impact",
        "ambition",
        "demoPotential",
      ] as const) {
        expect(concept.scoreRationale[axis]).toBeTruthy();
        expect(scores[axis]).toBeGreaterThanOrEqual(0);
        expect(scores[axis]).toBeLessThanOrEqual(10);
      }
    }
  });

  it("ranks the concepts from the highest score down", async () => {
    const discovery = await waitForDiscovery(discoveryId);
    const totals = discovery.concepts.map((concept: { totalScore: number }) => concept.totalScore);
    const sorted = [...totals].sort((a, b) => b - a);
    expect(totals).toEqual(sorted);
  });

  it("compares every concept against the existing projects", async () => {
    const discovery = await waitForDiscovery(discoveryId);
    for (const concept of discovery.concepts) {
      expect(concept.comparisons.length).toBeGreaterThan(0);
      const comparison = concept.comparisons[0];
      expect(comparison.similarity).toBeGreaterThanOrEqual(0);
      expect(comparison.similarity).toBeLessThanOrEqual(1);
      expect(comparison.overlap).toBeTruthy();
    }
  });

  it("recommends one concept with an explanation, evidence and caveats", async () => {
    const discovery = await waitForDiscovery(discoveryId);
    expect(discovery.recommendation).toBeTruthy();
    expect(discovery.recommendation.whyPromising).toBeTruthy();
    expect(discovery.recommendation.howItDiffers).toBeTruthy();
    expect(discovery.recommendation.caveats.length).toBeGreaterThan(0);
    expect(discovery.recommendation.supportingEvidence.length).toBeGreaterThan(0);

    const recommended = discovery.concepts.find(
      (concept: { id: string }) => concept.id === discovery.recommendation.conceptId,
    );
    expect(recommended).toBeDefined();
  });

  it("reports what is still unvalidated", async () => {
    const discovery = await waitForDiscovery(discoveryId);
    expect(discovery.analysis.unvalidated.length).toBeGreaterThan(0);
    expect(discovery.analysis.coverageNote).toBeTruthy();
  });

  it("builds a complete proposal for the recommended concept", async () => {
    const discovery = await waitForDiscovery(discoveryId);

    const response = await proposalRoute(
      post(`http://localhost/api/discover/${discoveryId}/proposal`, {
        conceptId: discovery.recommendation.conceptId,
        userNotes: "",
      }),
      { params: Promise.resolve({ discoveryId }) },
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    const proposal = payload.proposal.content;

    expect(proposal.title).toBeTruthy();
    expect(proposal.abstract).toBeTruthy();
    expect(proposal.problemStatement).toBeTruthy();
    expect(proposal.targetUsers).toBeTruthy();
    expect(proposal.solution).toBeTruthy();
    expect(proposal.coreFeatures.length).toBeGreaterThanOrEqual(3);
    expect(proposal.techStack.length).toBeGreaterThanOrEqual(3);
    expect(proposal.architecture).toBeTruthy();
    expect(proposal.implementationRoadmap.length).toBeGreaterThanOrEqual(3);
    expect(proposal.implementationRoadmap[0].tasks.length).toBeGreaterThan(0);
    expect(proposal.implementationRoadmap[0].exitCriteria).toBeTruthy();
    expect(proposal.validationPlan).toBeTruthy();
    expect(proposal.presentationOutline.length).toBeGreaterThanOrEqual(3);
    expect(proposal.originalityDisclosure).toBeTruthy();
    expect(proposal.uncertaintyNotes.length).toBeGreaterThan(0);
  });

  it("regenerates the concepts on request", async () => {
    const response = await proposalRoute(
      post(`http://localhost/api/discover/${discoveryId}/proposal`, { action: "regenerate" }),
      { params: Promise.resolve({ discoveryId }) },
    );

    expect(response.status).toBe(202);
    const discovery = await waitForDiscovery(discoveryId);
    expect(discovery.concepts.length).toBe(5);
  });

  it("rejects a discovery request with no sources", async () => {
    const response = await startDiscovery(
      post("http://localhost/api/discover", { sources: [] }),
    );
    expect(response.status).toBe(400);
  });
});

describe("discovery query plan", () => {
  it("covers winners, existing projects, emerging technology and real-world problems", () => {
    const plan = buildDiscoveryQueryPlan(["web", "devpost", "unstop", "hackernews"]);

    const kinds = new Set(plan.map((item) => item.kind));
    expect(kinds.has("winners")).toBe(true);
    expect(kinds.has("projects")).toBe(true);
    expect(kinds.has("open")).toBe(true);

    // Only the open web gets the emerging-technology and underserved-user
    // passes, and only when the user selected it.
    const openPasses = plan.filter((item) => item.kind === "open");
    expect(openPasses.length).toBeGreaterThanOrEqual(2);
    for (const pass of openPasses) {
      expect(pass.sourceId).toBe("web");
    }
  });

  it("does not add the open-web passes when the open web is not selected", () => {
    const plan = buildDiscoveryQueryPlan(["devpost"]);
    expect(plan.every((item) => item.kind !== "open")).toBe(true);
  });

  it("restricts each source to its own domains", () => {
    const plan = buildDiscoveryQueryPlan(["devpost", "unstop"]);
    for (const item of plan) {
      if (item.sourceId === "devpost") expect(item.includeDomains).toEqual(["devpost.com"]);
      if (item.sourceId === "unstop") expect(item.includeDomains).toEqual(["unstop.com"]);
    }
  });
});
