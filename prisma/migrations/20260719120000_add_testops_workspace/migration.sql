ALTER TABLE "TestCase"
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'major',
  ADD COLUMN "testType" TEXT NOT NULL DEFAULT 'functional',
  ADD COLUMN "automation" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "steps" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN "actualResult" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "defectId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "assignee" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "reviewer" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "TestRun"
  ADD COLUMN "blocked" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "packId" TEXT;

CREATE TABLE "TestPack" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "kind" TEXT NOT NULL DEFAULT 'saved',
  "owner" TEXT NOT NULL DEFAULT '',
  "caseIds" TEXT NOT NULL DEFAULT '[]',
  "defaultEnvironment" TEXT NOT NULL DEFAULT '',
  "defaultTargetId" TEXT NOT NULL DEFAULT '',
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestCycle" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "release" TEXT NOT NULL DEFAULT '',
  "environment" TEXT NOT NULL DEFAULT 'staging',
  "targetId" TEXT NOT NULL DEFAULT '',
  "owner" TEXT NOT NULL DEFAULT '',
  "testers" TEXT NOT NULL DEFAULT '[]',
  "startDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "executions" TEXT NOT NULL DEFAULT '{}',
  "linkedDefects" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestCycle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TestPack_projectId_archived_idx" ON "TestPack"("projectId", "archived");
CREATE INDEX "TestCycle_projectId_status_idx" ON "TestCycle"("projectId", "status");
CREATE INDEX "TestCycle_packId_idx" ON "TestCycle"("packId");

ALTER TABLE "TestPack" ADD CONSTRAINT "TestPack_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestCycle" ADD CONSTRAINT "TestCycle_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestCycle" ADD CONSTRAINT "TestCycle_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "TestPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "TestPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
