PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "baseUrl" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'production',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Environment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "authType" TEXT NOT NULL DEFAULT 'none',
  "authConfig" TEXT NOT NULL DEFAULT '{}',
  "customHeaders" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TestSuite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "config" TEXT NOT NULL DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TestSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TestCase" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "suiteId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "expectedResult" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TestCase_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "TestSuite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TestCase_suiteId_code_key" ON "TestCase" ("suiteId", "code");

CREATE TABLE IF NOT EXISTS "TestRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TestRun_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "TestSuite" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TestRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TestResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "caseCode" TEXT NOT NULL,
  "caseName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "stackTrace" TEXT NOT NULL DEFAULT '',
  "expectedResult" TEXT NOT NULL DEFAULT '',
  "aiDiagnosis" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "TestResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Artifact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "resultId" TEXT,
  "type" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Artifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Artifact_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TestResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AIRequestLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
