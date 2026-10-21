/**
 * Seed the database with a fully-worked DEMO research run.
 *
 * Run it with:
 *   npx prisma db seed
 * or:
 *   npx tsx prisma/seed.ts
 *
 * Everything it creates is flagged as demo data so the UI can label it
 * honestly. It never pretends to be live research.
 */
import { PrismaClient } from "../src/generated/prisma/client";

import { resolveDatabaseUrl } from "../src/lib/database-url";
import { createSqliteAdapter } from "../src/lib/sqlite-adapter";
import { DEMO_CLUSTERS, DEMO_RECORDS, DEMO_REPORT } from "../src/lib/research/demo";
import {
  DEMO_DISCOVERY_ANALYSIS,
  DEMO_DISCOVERY_COMMON_GROUND,
  DEMO_DISCOVERY_CONCEPTS,
  DEMO_DISCOVERY_RECOMMENDATION,
  DEMO_DISCOVERY_UNVALIDATED,
  DEMO_PROPOSAL,
} from "../src/lib/research/demo";

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL, process.cwd());
const adapter = createSqliteAdapter(databaseUrl);
const prisma = new PrismaClient({ adapter });

function json(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

async function main() {
  console.log("Seeding ProjectScope with a demo research run…");

  /*
   * The seed clears the tables first so it is repeatable. On a hosted
   * database that would destroy real research, so it only wipes a database
   * that has nothing in it. Pass --force to wipe and reseed anyway.
   */
  const force = process.argv.includes("--force");
  const existing = await prisma.researchJob.count();
  if (existing > 0 && !force) {
    console.log(
      `The database already holds ${existing} research run(s) — nothing was changed. ` +
        "Run `npm run db:seed -- --force` to wipe and reseed it.",
    );
    return;
  }

  // Start from a clean slate so the seed is repeatable.
  await prisma.savedReport.deleteMany();
  await prisma.pitch.deleteMany();
  await prisma.proposedConcept.deleteMany();
  await prisma.validationExperiment.deleteMany();
  await prisma.marketGapReport.deleteMany();
  await prisma.sourceReference.deleteMany();
  await prisma.researchEvent.deleteMany();
  await prisma.researchResult.deleteMany();
  await prisma.savedProject.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.ideaDiscovery.deleteMany();
  await prisma.researchJob.deleteMany();
  await prisma.project.deleteMany();

  const job = await prisma.researchJob.create({
    data: {
      topic: "AI tools that work without a reliable internet connection",
      problemStatement:
        "Students and health workers in low-connectivity regions lose access to AI features the moment the network drops.",
      domain: "Education, Health",
      targetUsers: "First-year students and community health workers in low-connectivity areas",
      geography: "India",
      resultLimit: 20,
      sources: json(["demo"]),
      status: "completed",
      stage: "done",
      isDemo: true,
      resultCount: DEMO_RECORDS.length,
      sourcesChecked: json([
        {
          sourceId: "demo",
          sourceName: "ProjectScope demo dataset",
          status: "ok",
          found: DEMO_RECORDS.length,
          note: "Bundled sample data. No live source was contacted.",
        },
      ]),
      isBookmarked: true,
      completedAt: new Date(),
    },
  });

  // --- Events ------------------------------------------------------------
  const eventRows = [
    {
      type: "demo.start",
      stage: "discovering",
      level: "warning",
      message:
        "Demo mode: no provider credentials are configured, so bundled sample records are used. These are NOT live research results.",
    },
    {
      type: "source.search",
      stage: "discovering",
      level: "success",
      message: `Demo dataset: ${DEMO_RECORDS.length} sample record(s) loaded.`,
    },
    {
      type: "store.done",
      stage: "storing",
      level: "success",
      message: `Saved ${DEMO_RECORDS.length} project record(s) with attribution, source URLs and retrieval timestamps.`,
    },
    {
      type: "analysis.done",
      stage: "analysing",
      level: "success",
      message: `Report ready: ${DEMO_REPORT.gaps.length} gap(s), ${DEMO_REPORT.patterns.length} repeated pattern(s), ${DEMO_REPORT.sources.length} cited source(s).`,
    },
    {
      type: "job.completed",
      stage: "done",
      level: "success",
      message: `Research finished: ${DEMO_RECORDS.length} project record(s) found.`,
    },
  ];

  for (const event of eventRows) {
    await prisma.researchEvent.create({ data: { jobId: job.id, ...event, payload: json({}) } });
  }

  // --- Projects ----------------------------------------------------------
  const projectIds: string[] = [];

  for (const [index, record] of DEMO_RECORDS.entries()) {
    const project = await prisma.project.create({
      data: {
        title: record.title,
        platform: record.platform,
        sourceId: "demo",
        sourceUrl: record.sourceUrl,
        attribution: `ProjectScope demo dataset — "${record.title}"`,
        summary: record.summary,
        problemAddressed: record.problemAddressed,
        proposedSolution: record.proposedSolution,
        targetUsers: record.targetUsers,
        technologies: json(record.technologies),
        businessModel: record.businessModel,
        distribution: record.distribution,
        award: null,
        awardVerified: false,
        domain: record.domain,
        uncertaintyNotes: json(record.uncertaintyNotes),
        discoveryMetadata: json([
          {
            sourceId: "demo",
            sourceName: "ProjectScope demo dataset",
            siteName: record.platform,
            snippet: record.summary,
            accessMode: "manual-import",
            retrievedAt: new Date().toISOString(),
          },
        ]),
        retrievedAt: new Date(),
      },
    });

    projectIds.push(project.id);

    await prisma.researchResult.create({
      data: {
        jobId: job.id,
        projectId: project.id,
        relevance: Math.max(0.25, 0.85 - index * 0.05),
        rank: index + 1,
        discoveryNote: "manual-import",
        isDemo: true,
      },
    });

    await prisma.sourceReference.create({
      data: {
        jobId: job.id,
        sourceId: "demo",
        sourceName: "ProjectScope demo dataset",
        url: record.sourceUrl,
        title: record.title,
        attribution: `ProjectScope demo dataset — "${record.title}"`,
        accessMode: "manual-import",
        snippet: record.summary,
        retrievedAt: new Date(),
      },
    });
  }

  // --- Clusters ----------------------------------------------------------
  for (const cluster of DEMO_CLUSTERS) {
    for (const index of cluster.memberIndexes) {
      const projectId = projectIds[index];
      if (!projectId) continue;
      await prisma.project.update({
        where: { id: projectId },
        data: { clusterId: cluster.clusterId },
      });
    }
  }

  // --- Report ------------------------------------------------------------
  await prisma.marketGapReport.create({
    data: {
      jobId: job.id,
      summary: DEMO_REPORT.summary,
      gaps: json(DEMO_REPORT.gaps),
      patterns: json(DEMO_REPORT.patterns),
      competitors: json(DEMO_REPORT.competitors),
      assumptions: json(DEMO_REPORT.assumptions),
      experiments: json(DEMO_REPORT.experiments),
      sources: json(DEMO_REPORT.sources),
      isDemo: true,
    },
  });

  for (const experiment of DEMO_REPORT.experiments) {
    await prisma.validationExperiment.create({
      data: {
        jobId: job.id,
        title: experiment.title,
        hypothesis: experiment.hypothesis,
        method: experiment.method,
        metric: experiment.metric,
        successCriteria: experiment.successCriteria,
        duration: experiment.duration,
        cost: experiment.cost,
        relatedGapId: experiment.relatedGapId,
        isDemo: true,
      },
    });
  }

  // --- Concepts ----------------------------------------------------------
  await prisma.proposedConcept.create({
    data: {
      jobId: job.id,
      title: "Demo concept: Offline-first assistive companion for low-bandwidth clinics",
      tagline: "Works without a connection, escalates only when a human must.",
      problem:
        "Health workers in low-connectivity areas lose triage context every time the network drops.",
      targetUsers: "Community health workers in low-connectivity areas",
      solution:
        "An offline-first triage log with a deterministic escalation list and a deferred sync queue.",
      differentiators: json([
        "Every feature works with the radio off — the sampled records assumed connectivity.",
        "Escalation is rule-based and auditable rather than model-generated.",
      ]),
      comparisons: json([
        {
          existingProjectTitle: "Sample: Telehealth triage assistant for rural clinics",
          existingProjectUrl: "https://unstop.com/demo/rural-triage-assistant",
          overlap: "Both target community health workers with a triage workflow.",
          similarity: 0.62,
          differences: [
            "This concept treats the offline case as the default rather than an edge case.",
            "Escalation is deterministic instead of model-generated.",
          ],
        },
      ]),
      risks: json([
        "No user has been interviewed yet.",
        "The assumption that a rule-based escalation list is acceptable to clinicians is untested.",
      ]),
      validationPlan:
        "Run three offline sessions with health workers using a paper-equivalent prototype; measure whether triage decisions match a supervisor's review.",
      similarityWarning: null,
      isDemo: true,
    },
  });

  // --- Pitch -------------------------------------------------------------
  await prisma.pitch.create({
    data: {
      jobId: job.id,
      content: json({
        problem:
          "Health workers in low-connectivity areas lose triage context every time the network drops.",
        targetUser: "Community health workers in low-connectivity areas",
        solution:
          "An offline-first triage log with a deterministic escalation list and a deferred sync queue.",
        differentiator:
          "Every feature works with the radio off, and escalation is rule-based so it can be audited.",
        valueProposition:
          "A health worker can complete a triage in a dead spot and still escalate the urgent case when signal returns.",
        validationResults:
          "No experiments have been run yet. Run the suggested sessions and report the real numbers here.",
        businessModel: "Paid by the district health authority; hardware optional.",
        goToMarket:
          "Start with two district clinics as pilot partners, then the regional health ministry.",
        demoOutline: [
          "1. The problem: a dropped connection mid-triage (30 seconds)",
          "2. The user: one health worker, one dead spot (20 seconds)",
          "3. The demo: triage offline, sync later (2 minutes)",
          "4. What we tested and what happened (1 minute)",
          "5. What is next (30 seconds)",
        ],
        judgeQuestions: [
          "How do you know a dropped connection is the real problem for this user?",
          "What happens when the deferred sync queue has a conflict?",
          "Why would a district pay for this over a paper register?",
        ],
        attribution: [
          "Sample: Telehealth triage assistant for rural clinics — inspiration only, not our project.",
        ],
        honestyNotes: [
          "We have not run a user session yet.",
          "The demo dataset these examples come from is synthetic and says nothing about a real market.",
        ],
      }),
      clarityScore: 58,
      clarityNotes: json([
        "The problem is stated in terms of the user's situation — keep that in the demo.",
        "Validation results are still empty. Judges will ask; prepare the answer now.",
        "The comparison with existing work is only mentioned in the attribution line. Say it out loud.",
      ]),
      isDemo: true,
    },
  });

  // --- A saved project ---------------------------------------------------
  await prisma.savedProject.create({
    data: {
      projectId: projectIds[0],
      note: "Closest existing work — check the offline assumptions before pitching against it.",
    },
  });

  await prisma.savedReport.create({
    data: {
      jobId: job.id,
      title: "AI tools that work without a reliable internet connection (report)",
      format: "markdown",
    },
  });

  // --- A free-choice discovery run -------------------------------------
  const discoveryJob = await prisma.researchJob.create({
    data: {
      topic: "Free-choice discovery — finding a problem worth solving",
      resultLimit: 30,
      sources: json(["demo"]),
      status: "completed",
      stage: "done",
      isDemo: true,
      resultCount: DEMO_RECORDS.length,
      sourcesChecked: json([
        {
          sourceId: "demo",
          sourceName: "ProjectScope demo dataset",
          status: "ok",
          found: DEMO_RECORDS.length,
          note: "Bundled sample data. No live source was contacted.",
        },
      ]),
      completedAt: new Date(),
    },
  });

  for (const [index, record] of DEMO_RECORDS.entries()) {
    const project = await prisma.project.create({
      data: {
        title: record.title,
        platform: record.platform,
        sourceId: "demo",
        sourceUrl: record.sourceUrl,
        attribution: `ProjectScope demo dataset — "${record.title}"`,
        summary: record.summary,
        problemAddressed: record.problemAddressed,
        proposedSolution: record.proposedSolution,
        targetUsers: record.targetUsers,
        technologies: json(record.technologies),
        businessModel: record.businessModel,
        distribution: record.distribution,
        domain: record.domain,
        uncertaintyNotes: json(record.uncertaintyNotes),
        discoveryMetadata: json([
          {
            sourceId: "demo",
            sourceName: "ProjectScope demo dataset",
            snippet: record.summary,
            accessMode: "manual-import",
            retrievedAt: new Date().toISOString(),
          },
        ]),
        retrievedAt: new Date(),
      },
    });

    await prisma.researchResult.create({
      data: {
        jobId: discoveryJob.id,
        projectId: project.id,
        relevance: Math.max(0.3, 0.8 - index * 0.04),
        rank: index + 1,
        discoveryNote: "manual-import",
        isDemo: true,
      },
    });
  }

  const discovery = await prisma.ideaDiscovery.create({
    data: {
      jobId: discoveryJob.id,
      status: "completed",
      stage: "done",
      isDemo: true,
      analysis: json({
        ...DEMO_DISCOVERY_ANALYSIS,
        commonGround: DEMO_DISCOVERY_COMMON_GROUND,
        unvalidated: DEMO_DISCOVERY_UNVALIDATED,
      }),
      concepts: json(DEMO_DISCOVERY_CONCEPTS),
      recommendation: json(DEMO_DISCOVERY_RECOMMENDATION),
    },
  });

  await prisma.proposal.create({
    data: {
      discoveryId: discovery.id,
      conceptId: DEMO_DISCOVERY_RECOMMENDATION.conceptId,
      title: DEMO_PROPOSAL.title,
      content: json(DEMO_PROPOSAL),
      isDemo: true,
    },
  });

  console.log(`Seeded demo research job: ${job.id}`);
  console.log(`  ${DEMO_RECORDS.length} demo project records`);
  console.log(`  ${DEMO_REPORT.gaps.length} market gaps`);
  console.log(`  ${DEMO_REPORT.experiments.length} validation experiments`);
  console.log(`  1 concept and 1 pitch`);
  console.log(`Seeded free-choice discovery run: ${discovery.id}`);
  console.log(`  ${DEMO_DISCOVERY_CONCEPTS.length} ranked concepts`);
  console.log(`  1 full project proposal`);
  console.log("");
  console.log("Open http://localhost:3000 to see it. Every record is labelled as demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
