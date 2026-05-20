-- PostgreSQL initial schema for Passmark TestOps.
-- SQLite migration files are kept under prisma/legacy-sqlite for reference only.

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "baseUrl" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'production',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Environment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "authType" TEXT NOT NULL DEFAULT 'none',
  "authConfig" TEXT NOT NULL DEFAULT '{}',
  "customHeaders" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestSuite" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "config" TEXT NOT NULL DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestCase" (
  "id" TEXT NOT NULL,
  "suiteId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "expectedResult" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestRun" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "suiteId" TEXT,
  "environmentId" TEXT,
  "url" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "total" INTEGER NOT NULL DEFAULT 0,
  "passed" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "generatedSpecPath" TEXT NOT NULL DEFAULT '',
  "rawOutputPath" TEXT NOT NULL DEFAULT '',
  "userRequest" TEXT NOT NULL DEFAULT '',
  "stdout" TEXT NOT NULL DEFAULT '',
  "stderr" TEXT NOT NULL DEFAULT '',
  "generatedCode" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestResult" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "caseCode" TEXT NOT NULL,
  "caseName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "stackTrace" TEXT NOT NULL DEFAULT '',
  "expectedResult" TEXT NOT NULL DEFAULT '',
  "aiDiagnosis" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Artifact" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "resultId" TEXT,
  "type" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIRequestLog" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIRequestLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestCase_suiteId_code_key" ON "TestCase"("suiteId", "code");
CREATE INDEX "Environment_projectId_idx" ON "Environment"("projectId");
CREATE INDEX "TestSuite_projectId_idx" ON "TestSuite"("projectId");
CREATE INDEX "TestRun_projectId_idx" ON "TestRun"("projectId");
CREATE INDEX "TestRun_suiteId_idx" ON "TestRun"("suiteId");
CREATE INDEX "TestRun_environmentId_idx" ON "TestRun"("environmentId");
CREATE INDEX "TestResult_runId_idx" ON "TestResult"("runId");
CREATE INDEX "Artifact_runId_idx" ON "Artifact"("runId");
CREATE INDEX "Artifact_resultId_idx" ON "Artifact"("resultId");

ALTER TABLE "Environment"
  ADD CONSTRAINT "Environment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestSuite"
  ADD CONSTRAINT "TestSuite_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestCase"
  ADD CONSTRAINT "TestCase_suiteId_fkey"
  FOREIGN KEY ("suiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestRun"
  ADD CONSTRAINT "TestRun_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestRun"
  ADD CONSTRAINT "TestRun_suiteId_fkey"
  FOREIGN KEY ("suiteId") REFERENCES "TestSuite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestRun"
  ADD CONSTRAINT "TestRun_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestResult"
  ADD CONSTRAINT "TestResult_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Artifact"
  ADD CONSTRAINT "Artifact_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Artifact"
  ADD CONSTRAINT "Artifact_resultId_fkey"
  FOREIGN KEY ("resultId") REFERENCES "TestResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
