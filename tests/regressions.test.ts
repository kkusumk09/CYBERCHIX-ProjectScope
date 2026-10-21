import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";

import { prisma } from "@/lib/db";
import {
  manualImportSchema,
  pitchRequestSchema,
  pitchUpdateSchema,
  type PitchContent,
} from "@/lib/schema";
import { resolveDatabaseUrl, resolveMigrationUrl } from "@/lib/database-url";
import { createSqliteAdapter } from "@/lib/sqlite-adapter";

import { POST as startResearch } from "@/app/api/research/route";
import { GET as getResearch } from "@/app/api/research/[jobId]/route";
import { POST as importRecords } from "@/app/api/research/[jobId]/import/route";
import { GET as getPitch, POST as createPitch, PUT as savePitch } from "@/app/api/pitch/route";
import { POST as createConcepts } from "@/app/api/concepts/route";
import { GET as getConcepts } from "@/app/api/concepts/route";
import { GET as getProjects } from "@/app/api/projects/route";

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function put(url: string, body: unknown): Request {
  return new Request(url, {
    method: "PUT",
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

/* -------------------------------------------------------------------------- */

describe("manual import validation", () => {
  it("accepts a record with no link", () => {
    // A pasted record does not always have a URL. This used to be rejected
    // with a 400, which made the most common import flow impossible.
    const parsed = manualImportSchema.parse({
      jobId: "job-1",
      sourceId: "web",
      entries: [{ title: "A record without a link", url: "", summary: "Pasted by hand." }],
    });
    expect(parsed.entries[0].url).toBe("");
    expect(parsed.entries[0].title).toBe("A record without a link");
  });

  it("still rejects a link that is present but not a URL", () => {
    const result = manualImportSchema.safeParse({
      jobId: "job-1",
      sourceId: "web",
      entries: [{ title: "Broken link", url: "not-a-url" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a real URL", () => {
    const result = manualImportSchema.safeParse({
      jobId: "job-1",
      sourceId: "web",
      entries: [{ title: "Linked record", url: "https://example.com/project" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("pitch request validation", () => {
  it("defaults the notes to an empty string", () => {
    const parsed = pitchRequestSchema.parse({ jobId: "job-1" });
    expect(parsed.notes).toBe("");
  });

  it("keeps the notes the user wrote", () => {
    const parsed = pitchRequestSchema.parse({
      jobId: "job-1",
      notes: "We built an offline triage log. Six health workers tried it.",
    });
    expect(parsed.notes).toContain("offline triage log");
  });

  it("fills in the parts of a pitch update the client did not send", () => {
    // Every field of a pitch has a default, so a partial update is valid and
    // the missing fields fall back to an empty string rather than failing.
    const parsed = pitchUpdateSchema.parse({
      jobId: "job-1",
      content: { problem: "x" },
    });
    expect(parsed.content.problem).toBe("x");
    expect(parsed.content.solution).toBe("");
    expect(parsed.content.demoOutline).toEqual([]);
  });

  it("rejects a pitch update that is not an object at all", () => {
    const result = pitchUpdateSchema.safeParse({ jobId: "job-1", content: "nope" });
    expect(result.success).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe("the hosted database migration runner", () => {
  const repoRoot = path.resolve(__dirname, "..");
  let directory = "";
  let databaseFile = "";

  beforeAll(() => {
    directory = mkdtempSync(path.join(tmpdir(), "projectscope-migrate-"));
    databaseFile = path.join(directory, "test.db");
  });

  afterAll(() => {
    /*
     * The native libSQL client can keep a handle on the database file for a
     * moment on Windows, which makes the directory undeletable for a while.
     * The directory lives in the system temp folder, so failing the suite
     * over a leftover file is not worth it.
     */
    try {
      rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {
      // Deliberately ignored.
    }
  });

  function run(): string {
    return execFileSync(process.execPath, ["scripts/migrate-libsql.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: `file:${databaseFile}` },
    });
  }

  it("applies every migration to an empty database", () => {
    const output = run();
    expect(output).toContain("Applied");
  });

  it("produces the tables the application needs", async () => {
    const client = createClient({ url: `file:${databaseFile}` });
    try {
      const tables = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table'",
      );
      const names = tables.rows.map((row) => String(row.name));
      for (const table of [
        "ResearchJob",
        "ResearchResult",
        "Project",
        "MarketGapReport",
        "ProposedConcept",
        "Pitch",
        "IdeaDiscovery",
        "Proposal",
      ]) {
        expect(names).toContain(table);
      }
    } finally {
      client.close();
    }
  });

  it("produces the column the concept count needs", async () => {
    const client = createClient({ url: `file:${databaseFile}` });
    try {
      const columns = await client.execute('PRAGMA table_info("IdeaDiscovery")');
      const names = columns.rows.map((row) => String(row.name));
      expect(names).toContain("conceptCount");
    } finally {
      client.close();
    }
  });

  it("is idempotent — a second run applies nothing", () => {
    const output = run();
    expect(output).toContain("already up to date");
  });

  it("refuses a database it does not understand", () => {
    let output = "";
    let status = 0;
    try {
      output = execFileSync(process.execPath, ["scripts/migrate-libsql.mjs"], {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: "postgres://user:pass@host/db" },
        stdio: "pipe",
      });
    } catch (error) {
      output = String((error as { stderr?: string }).stderr ?? "");
      status = (error as { status?: number }).status ?? 1;
    }
    expect(status).not.toBe(0);
    expect(output).toContain("Unsupported");
  });

  it("rolls a failed migration back, leaving the database clean", async () => {
    const brokenDir = path.join(directory, "broken-migrations");
    const brokenMigration = path.join(brokenDir, "20260101000000_broken");
    mkdirSync(brokenMigration, { recursive: true });
    writeFileSync(
      path.join(brokenMigration, "migration.sql"),
      'CREATE TABLE "Survivor" ("id" TEXT PRIMARY KEY);\nTHIS IS NOT SQL;\n',
      "utf8",
    );

    const brokenDb = path.join(directory, "broken.db");
    let status = 0;
    let output = "";
    try {
      output = execFileSync(process.execPath, ["scripts/migrate-libsql.mjs"], {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: `file:${brokenDb}`,
          PROJECTSCOPE_MIGRATIONS_DIR: brokenDir,
        },
        stdio: "pipe",
      });
    } catch (error) {
      output = String((error as { stderr?: string }).stderr ?? "");
      status = (error as { status?: number }).status ?? 1;
    }

    expect(status).not.toBe(0);
    expect(output).toContain("rolled back");

    // The half-applied table must not exist, and the migration must not be
    // recorded as applied — otherwise the next deploy would skip it.
    const client = createClient({ url: `file:${brokenDb}` });
    try {
      const tables = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Survivor'",
      );
      expect(tables.rows).toHaveLength(0);

      const applied = await client.execute(
        'SELECT "name" FROM "_projectscope_migrations"',
      );
      expect(applied.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });
});

describe("database url resolution", () => {
  it("resolves a relative file url against the prisma folder", () => {
    const resolved = resolveDatabaseUrl("file:./dev.db", "/tmp/project");
    expect(resolved).toBe("file:/tmp/project/prisma/dev.db");
  });

  it("leaves a hosted libsql url untouched", () => {
    expect(resolveDatabaseUrl("libsql://db.turso.io", "/tmp/project")).toBe("libsql://db.turso.io");
  });

  it("folds the auth token into the migration url for libsql", () => {
    const previous = process.env.TURSO_AUTH_TOKEN;
    process.env.TURSO_AUTH_TOKEN = "tok_123";
    try {
      const url = resolveMigrationUrl("libsql://db.turso.io", "/tmp/project");
      expect(url).toBe("libsql://db.turso.io?authToken=tok_123");
    } finally {
      if (previous === undefined) delete process.env.TURSO_AUTH_TOKEN;
      else process.env.TURSO_AUTH_TOKEN = previous;
    }
  });

  it("never rewrites a file url for the migration engine", () => {
    expect(resolveMigrationUrl("file:./dev.db", "/tmp/project")).toBe(
      "file:/tmp/project/prisma/dev.db",
    );
  });

  it("uses the libsql driver for both a hosted url and a local file", () => {
    const hosted = createSqliteAdapter("libsql://db.turso.io") as unknown as {
      adapterName: string;
      provider: string;
    };
    const local = createSqliteAdapter("file:./dev.db") as unknown as {
      adapterName: string;
      provider: string;
    };
    // One adapter for both backends. The native module it loads is built
    // against NAPI, so it keeps working when the Node version changes.
    expect(hosted.adapterName).toBe("@prisma/adapter-libsql");
    expect(local.adapterName).toBe("@prisma/adapter-libsql");
    // Both speak the same dialect, so the Prisma schema is identical.
    expect(hosted.provider).toBe("sqlite");
    expect(local.provider).toBe("sqlite");
  });
});

/* -------------------------------------------------------------------------- */

describe("the fixes that make the interface work (demo mode)", () => {
  let jobId = "";

  beforeAll(async () => {
    const response = await startResearch(
      post("http://localhost/api/research", {
        topic: "offline AI tools for rural clinics",
        sources: ["devpost", "unstop", "web"],
        resultLimit: 4,
      }),
    );
    expect(response.status).toBe(202);
    const payload = await response.json();
    jobId = payload.job.id;
    await waitForJob(jobId);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("imports a record that has no link", async () => {
    const response = await importRecords(
      post(`http://localhost/api/research/${jobId}/import`, {
        jobId,
        sourceId: "web",
        entries: [{ title: "No-link record", url: "", summary: "Pasted by hand." }],
      }),
      { params: Promise.resolve({ jobId }) },
    );
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.imported).toBe(1);
  });

  it("writes the pitch from the notes the user typed", async () => {
    const response = await createPitch(
      post("http://localhost/api/pitch", {
        jobId,
        notes: "Six health workers tried the offline triage log.",
      }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    // The notes have to reach the generated pitch, otherwise the field is a
    // no-op and the interface is lying about what it does.
    expect(payload.content.solution).toContain("Six health workers");
  });

  it("saves a hand-edited pitch and keeps it after a reload", async () => {
    const edited: PitchContent = {
      problem: "Edited problem",
      targetUser: "Edited user",
      solution: "Edited solution",
      differentiator: "Edited differentiator",
      valueProposition: "Edited value",
      validationResults: "Edited validation",
      businessModel: "Edited business model",
      goToMarket: "Edited go to market",
      demoOutline: ["Beat one", "Beat two"],
      judgeQuestions: ["A hard question?"],
      attribution: ["Sample project — Devpost"],
      honestyNotes: ["Still unvalidated."],
    };

    const saved = await savePitch(put("http://localhost/api/pitch", { jobId, content: edited }));
    expect(saved.status).toBe(200);

    const reread = await getPitch(new Request(`http://localhost/api/pitch?jobId=${jobId}`));
    expect(reread.status).toBe(200);
    const payload = await reread.json();
    expect(payload.pitch.content.problem).toBe("Edited problem");
    expect(payload.pitch.content.goToMarket).toBe("Edited go to market");
    expect(payload.pitch.content.demoOutline).toEqual(["Beat one", "Beat two"]);
  });

  it("keeps generated concepts in the database so a reload still shows them", async () => {
    const created = await createConcepts(
      post("http://localhost/api/concepts", { jobId, constraints: "48 hours", count: 3 }),
    );
    expect(created.status).toBe(200);

    const stored = await getConcepts(new Request(`http://localhost/api/concepts?jobId=${jobId}`));
    const payload = await stored.json();
    expect(payload.concepts.length).toBeGreaterThan(0);
    for (const concept of payload.concepts) {
      expect(concept.title).toBeTruthy();
    }
  });

  it("counts the award facet buckets separately", async () => {
    const response = await getProjects(new Request("http://localhost/api/projects"));
    const payload = await response.json();

    const awards = payload.facets.awards;
    expect(typeof awards.verified).toBe("number");
    expect(typeof awards.unverified).toBe("number");
    expect(typeof awards.none).toBe("number");
    // The "none" bucket used to be hard-coded to 0.
    expect(awards.none).toBeGreaterThan(0);

    // "unverified" means an award was claimed but not confirmed, so the two
    // buckets must not overlap.
    const unverified = await getProjects(
      new Request("http://localhost/api/projects?award=unverified"),
    );
    const unverifiedPayload = await unverified.json();
    for (const project of unverifiedPayload.projects) {
      expect(project.award).toBeTruthy();
      expect(project.awardVerified).toBe(false);
    }

    const none = await getProjects(new Request("http://localhost/api/projects?award=none"));
    const nonePayload = await none.json();
    for (const project of nonePayload.projects) {
      expect(project.award).toBeFalsy();
    }
  });
});
