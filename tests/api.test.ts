import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { POST as startResearch } from "@/app/api/research/route";
import { GET as getResearch } from "@/app/api/research/[jobId]/route";
import { GET as getProjects } from "@/app/api/projects/route";
import { GET as getAnalysis, POST as runAnalysis } from "@/app/api/analysis/route";
import { POST as createConcepts } from "@/app/api/concepts/route";
import { POST as createPitch } from "@/app/api/pitch/route";
import { POST as exportReport } from "@/app/api/export/route";
import { POST as importRecords } from "@/app/api/research/[jobId]/import/route";
import { POST as saveProject } from "@/app/api/projects/save/route";

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function waitForJob(jobId: string, timeoutMs = 20_000) {
  const started = Date.now();
  while (true) {
    const response = await getResearch(
      new Request(`http://localhost/api/research/${jobId}`),
      { params: Promise.resolve({ jobId }) },
    );
    const payload = await response.json();
    const status = payload.job?.status;
    if (status === "completed" || status === "failed" || status === "cancelled") {
      return payload.job;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`The research job did not finish in time (status: ${status}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

describe("research pipeline (demo mode)", () => {
  let jobId = "";

  beforeAll(async () => {
    const response = await startResearch(
      post("http://localhost/api/research", {
        topic: "offline AI tools for rural clinics",
        problemStatement: "Features break without a connection.",
        domain: "Health",
        targetUsers: "community health workers",
        geography: "India",
        sources: ["devpost", "unstop", "web"],
        resultLimit: 6,
      }),
    );

    expect(response.status).toBe(202);
    const payload = await response.json();
    jobId = payload.job.id;
    expect(payload.demoMode).toBe(true);
    expect(payload.job.isDemo).toBe(true);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("completes the run and records the number of records found", async () => {
    const job = await waitForJob(jobId);
    expect(job.status).toBe("completed");
    expect(job.resultCount).toBeGreaterThan(0);
    expect(job.resultCount).toBeLessThanOrEqual(6);
  });

  it("stores every project with attribution, a source URL and uncertainty notes", async () => {
    const response = await getProjects(
      new Request(`http://localhost/api/projects?jobId=${jobId}`),
    );
    const payload = await response.json();

    expect(payload.total).toBeGreaterThan(0);
    for (const project of payload.projects) {
      expect(project.title).toBeTruthy();
      expect(project.sourceUrl).toMatch(/^https?:\/\//);
      expect(project.attribution).toBeTruthy();
      expect(project.retrievedAt).toBeTruthy();
      expect(Array.isArray(project.uncertaintyNotes)).toBe(true);
      expect(project.uncertaintyNotes.length).toBeGreaterThan(0);
    }
  });

  it("labels demo records as demo data", async () => {
    const response = await getProjects(
      new Request(`http://localhost/api/projects?jobId=${jobId}`),
    );
    const payload = await response.json();
    for (const project of payload.projects) {
      expect(project.isDemo).toBe(true);
    }
  });

  it("records which sources were actually checked", async () => {
    const response = await getResearch(
      new Request(`http://localhost/api/research/${jobId}`),
      { params: Promise.resolve({ jobId }) },
    );
    const payload = await response.json();
    expect(payload.job.sourcesChecked.length).toBeGreaterThan(0);
    for (const check of payload.job.sourcesChecked) {
      expect(check.sourceName).toBeTruthy();
      expect(typeof check.found).toBe("number");
    }
  });

  it("writes a market-gap report with evidence and source links", async () => {
    const response = await getAnalysis(
      new Request(`http://localhost/api/analysis?jobId=${jobId}`),
    );
    const payload = await response.json();

    expect(payload.report.isDemo).toBe(true);
    expect(payload.report.gaps.length).toBeGreaterThan(0);

    const gap = payload.report.gaps[0];
    expect(gap.observation).toBeTruthy();
    expect(gap.supportingEvidence.length).toBeGreaterThan(0);
    expect(gap.confidence).toBeTruthy();
    expect(gap.claimType).toBeTruthy();
    expect(gap.validationExperiment).toBeTruthy();
  });

  it("can regenerate the analysis on demand", async () => {
    const response = await runAnalysis(post("http://localhost/api/analysis", { jobId }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.report.gaps.length).toBeGreaterThan(0);
  });

  it("generates concepts and pitches for the run", async () => {
    const conceptsResponse = await createConcepts(
      post("http://localhost/api/concepts", { jobId, constraints: "48 hours, web only", count: 2 }),
    );
    expect(conceptsResponse.status).toBe(200);
    const concepts = await conceptsResponse.json();
    expect(concepts.concepts.length).toBeGreaterThan(0);
    expect(concepts.concepts[0].comparisons.length).toBeGreaterThan(0);

    const pitchResponse = await createPitch(
      post("http://localhost/api/pitch", { jobId, conceptId: "", extra: "" }),
    );
    expect(pitchResponse.status).toBe(200);
    const pitch = await pitchResponse.json();
    expect(pitch.pitch.content.problem).toBeTruthy();
    expect(pitch.pitch.content.honestyNotes.length).toBeGreaterThan(0);
  });

  it("exports a markdown report with the source-attribution section", async () => {
    const response = await exportReport(
      post("http://localhost/api/export", { jobId, format: "markdown" }),
    );
    expect(response.status).toBe(200);

    const markdown = await response.text();
    expect(markdown).toContain("# ProjectScope research report");
    expect(markdown).toContain("Inspiration & source attribution");
    expect(markdown).toContain("DEMO MODE");
    expect(markdown).toContain("## 1. Coverage");
  });

  it("exports a JSON report", async () => {
    const response = await exportReport(
      post("http://localhost/api/export", { jobId, format: "json" }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.job.id).toBe(jobId);
    expect(payload.projects.length).toBeGreaterThan(0);
    expect(payload.report.gaps.length).toBeGreaterThan(0);
  });

  it("accepts a manually imported record and marks it as manual", async () => {
    const response = await importRecords(
      post(`http://localhost/api/research/${jobId}/import`, {
        jobId,
        sourceId: "devpost",
        entries: [
          {
            title: "Manually imported project",
            url: "https://devpost.com/software/manual",
            platform: "Devpost",
            summary: "A project the user supplied.",
            problemAddressed: "",
            proposedSolution: "",
            targetUsers: "",
            technologies: ["React"],
            award: "",
            attribution: "A team — a hackathon",
          },
        ],
      }),
      { params: Promise.resolve({ jobId }) },
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.imported).toBe(1);

    const projects = await (
      await getProjects(new Request(`http://localhost/api/projects?jobId=${jobId}`))
    ).json();
    const imported = projects.projects.find(
      (project: { title: string }) => project.title === "Manually imported project",
    );
    expect(imported).toBeDefined();
    expect(imported.uncertaintyNotes.join(" ")).toMatch(/manually imported/i);
  });

  it("saves and unsaves a project", async () => {
    const projects = await (
      await getProjects(new Request(`http://localhost/api/projects?jobId=${jobId}`))
    ).json();
    const projectId = projects.projects[0].id;

    const save = await saveProject(
      post("http://localhost/api/projects/save", { projectId, note: "look again" }),
    );
    expect(save.status).toBe(200);
    expect((await save.json()).saved).toBe(true);

    const unsave = await saveProject(
      post("http://localhost/api/projects/save", { projectId, note: "", saved: false }),
    );
    expect(unsave.status).toBe(200);
    expect((await unsave.json()).saved).toBe(false);
  });

  it("rejects an invalid research request with a clear message", async () => {
    const response = await startResearch(
      post("http://localhost/api/research", { topic: "" }),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("validation_error");
  });

  it("rejects a comparison with fewer than two projects", async () => {
    const { POST: compare } = await import("@/app/api/compare/route");
    const response = await compare(
      post("http://localhost/api/compare", { jobId, projectIds: ["only-one"] }),
    );
    expect(response.status).toBe(400);
  });
});
