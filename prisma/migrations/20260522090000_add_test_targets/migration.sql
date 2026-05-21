CREATE TABLE "TestTarget" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL DEFAULT '',
  "localPath" TEXT NOT NULL DEFAULT '',
  "config" TEXT NOT NULL DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestTarget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TestRun" ADD COLUMN "targetId" TEXT;

ALTER TABLE "TestTarget"
  ADD CONSTRAINT "TestTarget_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestRun"
  ADD CONSTRAINT "TestRun_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "TestTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
