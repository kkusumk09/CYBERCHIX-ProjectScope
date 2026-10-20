-- CreateTable
CREATE TABLE "ResearchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "problemStatement" TEXT,
    "domain" TEXT,
    "targetUsers" TEXT,
    "geography" TEXT,
    "resultLimit" INTEGER NOT NULL DEFAULT 20,
    "sources" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "sourcesChecked" TEXT NOT NULL DEFAULT '[]',
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ResearchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "payload" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "problemAddressed" TEXT,
    "proposedSolution" TEXT,
    "targetUsers" TEXT,
    "technologies" TEXT NOT NULL DEFAULT '[]',
    "businessModel" TEXT,
    "distribution" TEXT,
    "award" TEXT,
    "awardVerified" BOOLEAN NOT NULL DEFAULT false,
    "ranking" TEXT,
    "domain" TEXT,
    "clusterId" TEXT,
    "uncertaintyNotes" TEXT NOT NULL DEFAULT '[]',
    "discoveryMetadata" TEXT NOT NULL DEFAULT '[]',
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SourceReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "attribution" TEXT NOT NULL,
    "accessMode" TEXT NOT NULL,
    "snippet" TEXT,
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceReference_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "relevance" REAL NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "discoveryNote" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketGapReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "gaps" TEXT NOT NULL DEFAULT '[]',
    "patterns" TEXT NOT NULL DEFAULT '[]',
    "competitors" TEXT NOT NULL DEFAULT '[]',
    "assumptions" TEXT NOT NULL DEFAULT '[]',
    "experiments" TEXT NOT NULL DEFAULT '[]',
    "sources" TEXT NOT NULL DEFAULT '[]',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketGapReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposedConcept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "targetUsers" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "differentiators" TEXT NOT NULL DEFAULT '[]',
    "comparisons" TEXT NOT NULL DEFAULT '[]',
    "risks" TEXT NOT NULL DEFAULT '[]',
    "validationPlan" TEXT NOT NULL,
    "similarityWarning" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposedConcept_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationExperiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "successCriteria" TEXT NOT NULL,
    "duration" TEXT,
    "cost" TEXT,
    "relatedGapId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationExperiment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pitch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "clarityScore" INTEGER,
    "clarityNotes" TEXT NOT NULL DEFAULT '[]',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pitch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'markdown',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ResearchEvent_jobId_createdAt_idx" ON "ResearchEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "SourceReference_jobId_idx" ON "SourceReference"("jobId");

-- CreateIndex
CREATE INDEX "ResearchResult_jobId_relevance_idx" ON "ResearchResult"("jobId", "relevance");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchResult_jobId_projectId_key" ON "ResearchResult"("jobId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketGapReport_jobId_key" ON "MarketGapReport"("jobId");

-- CreateIndex
CREATE INDEX "ProposedConcept_jobId_idx" ON "ProposedConcept"("jobId");

-- CreateIndex
CREATE INDEX "ValidationExperiment_jobId_idx" ON "ValidationExperiment"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Pitch_jobId_key" ON "Pitch"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedProject_projectId_key" ON "SavedProject"("projectId");

-- CreateIndex
CREATE INDEX "SavedReport_jobId_idx" ON "SavedReport"("jobId");
