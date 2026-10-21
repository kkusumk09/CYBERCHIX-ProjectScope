-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IdeaDiscovery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "interests" TEXT NOT NULL DEFAULT '',
    "techPreferences" TEXT NOT NULL DEFAULT '',
    "teamCapabilities" TEXT NOT NULL DEFAULT '',
    "constraints" TEXT NOT NULL DEFAULT '',
    "conceptCount" INTEGER NOT NULL DEFAULT 5,
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
INSERT INTO "new_IdeaDiscovery" ("analysis", "concepts", "constraints", "createdAt", "errorMessage", "id", "interests", "isDemo", "jobId", "recommendation", "stage", "status", "teamCapabilities", "techPreferences", "updatedAt") SELECT "analysis", "concepts", "constraints", "createdAt", "errorMessage", "id", "interests", "isDemo", "jobId", "recommendation", "stage", "status", "teamCapabilities", "techPreferences", "updatedAt" FROM "IdeaDiscovery";
DROP TABLE "IdeaDiscovery";
ALTER TABLE "new_IdeaDiscovery" RENAME TO "IdeaDiscovery";
CREATE UNIQUE INDEX "IdeaDiscovery_jobId_key" ON "IdeaDiscovery"("jobId");
CREATE INDEX "IdeaDiscovery_createdAt_idx" ON "IdeaDiscovery"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
