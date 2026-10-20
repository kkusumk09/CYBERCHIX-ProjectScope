-- CreateTable
CREATE TABLE "IdeaDiscovery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "interests" TEXT NOT NULL DEFAULT '',
    "techPreferences" TEXT NOT NULL DEFAULT '',
    "teamCapabilities" TEXT NOT NULL DEFAULT '',
    "constraints" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "concepts" TEXT NOT NULL DEFAULT '[]',
    "recommendation" TEXT,
    "analysis" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IdeaDiscovery_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discoveryId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "IdeaDiscovery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IdeaDiscovery_jobId_key" ON "IdeaDiscovery"("jobId");

-- CreateIndex
CREATE INDEX "IdeaDiscovery_createdAt_idx" ON "IdeaDiscovery"("createdAt");

-- CreateIndex
CREATE INDEX "Proposal_discoveryId_idx" ON "Proposal"("discoveryId");
