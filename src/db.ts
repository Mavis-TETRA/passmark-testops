import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.PRISMA_QUERY_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

const DEFAULT_PROJECT_ID = 'project-default-custom';
const DEFAULT_ENVIRONMENT_ID = 'environment-default-production';
const DEFAULT_SUITE_ID = 'suite-default-custom';
const DEFAULT_TARGET_ID = 'target-default-website';
const DEFAULT_CUSTOM_CONFIG = JSON.stringify({
  instruction: 'Create broad custom website checks from the suite description and run request.',
});

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newId(prefix: string): string {
  return createId(prefix);
}

function logDatabaseError(error: unknown) {
  console.error('[database] Unable to connect to PostgreSQL or apply the default seed data.');
  console.error('[database] Check DATABASE_URL and make sure PostgreSQL is running before starting Passmark TestOps.');
  console.error(error);
}

async function ensureDefaultEnvironmentForProject(project: { id: string; baseUrl: string; environment: string }) {
  const existingEnvironment = await prisma.environment.findFirst({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
  });

  if (existingEnvironment) {
    return existingEnvironment;
  }

  return prisma.environment.create({
    data: {
      id: createId('environment'),
      projectId: project.id,
      name: project.environment || 'production',
      baseUrl: project.baseUrl,
      authType: 'none',
      authConfig: '{}',
      customHeaders: '{}',
    },
  });
}

export async function createDefaultTargetForProject(project: { id: string; baseUrl: string; environment?: string }) {
  const existingTarget = await prisma.testTarget.findFirst({
    where: {
      projectId: project.id,
      type: {
        in: ['web-url', 'local-web'],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (existingTarget) {
    return existingTarget;
  }

  return prisma.testTarget.create({
    data: {
      id: project.id === DEFAULT_PROJECT_ID ? DEFAULT_TARGET_ID : createId('target'),
      projectId: project.id,
      name: 'Default Website',
      type: project.environment === 'local' ? 'local-web' : 'web-url',
      url: project.baseUrl,
      localPath: '',
      config: '{}',
      enabled: true,
    },
  });
}

export async function ensureDefaultData() {
  try {
    await prisma.$connect();

    const existingProjects = await prisma.project.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (existingProjects.length > 0) {
      for (const project of existingProjects) {
        await ensureDefaultEnvironmentForProject(project);
        await createDefaultTargetForProject(project);
        const suite = await createDefaultSuiteForProject(project.id);
        await ensureDefaultWorkspaceForProject(project.id, suite.id);
      }
      return;
    }

    const project = await prisma.project.upsert({
      where: { id: DEFAULT_PROJECT_ID },
      update: {},
      create: {
        id: DEFAULT_PROJECT_ID,
        name: 'Default Custom Project',
        description: 'Default project created for local AI custom automation testing.',
        baseUrl: 'https://example.com/',
        environment: 'production',
      },
    });

    await prisma.environment.upsert({
      where: { id: DEFAULT_ENVIRONMENT_ID },
      update: {
        projectId: project.id,
        name: project.environment,
        baseUrl: project.baseUrl,
        authType: 'none',
        authConfig: '{}',
        customHeaders: '{}',
      },
      create: {
        id: DEFAULT_ENVIRONMENT_ID,
        projectId: project.id,
        name: project.environment,
        baseUrl: project.baseUrl,
        authType: 'none',
        authConfig: '{}',
        customHeaders: '{}',
      },
    });

    await prisma.testTarget.upsert({
      where: { id: DEFAULT_TARGET_ID },
      update: {
        projectId: project.id,
        name: 'Default Website',
        type: 'web-url',
        url: project.baseUrl,
        localPath: '',
        config: '{}',
        enabled: true,
      },
      create: {
        id: DEFAULT_TARGET_ID,
        projectId: project.id,
        name: 'Default Website',
        type: 'web-url',
        url: project.baseUrl,
        localPath: '',
        config: '{}',
        enabled: true,
      },
    });

    const suite = await prisma.testSuite.upsert({
      where: { id: DEFAULT_SUITE_ID },
      update: {
        projectId: project.id,
        name: 'Custom Website Checks',
        type: 'custom',
        description: 'Generate broad Playwright checks from the suite description and run request.',
        enabled: true,
        config: DEFAULT_CUSTOM_CONFIG,
      },
      create: {
        id: DEFAULT_SUITE_ID,
        projectId: project.id,
        name: 'Custom Website Checks',
        type: 'custom',
        description: 'Generate broad Playwright checks from the suite description and run request.',
        enabled: true,
        config: DEFAULT_CUSTOM_CONFIG,
      },
    });

    await ensureDefaultWorkspaceForProject(project.id, suite.id);
  } catch (error) {
    logDatabaseError(error);
    throw error;
  }
}

export async function createDefaultSuiteForProject(projectId: string) {
  const existingSuite = await prisma.testSuite.findFirst({
    where: {
      projectId,
      type: 'custom',
    },
    orderBy: { createdAt: 'asc' },
  });

  if (existingSuite) {
    return existingSuite;
  }

  const suite = await prisma.testSuite.create({
    data: {
      id: createId('suite'),
      projectId,
      name: 'Custom Website Checks',
      type: 'custom',
      description: 'Generate broad Playwright checks from the suite description and run request.',
      enabled: true,
      config: DEFAULT_CUSTOM_CONFIG,
    },
  });

  return suite;
}

export async function ensureDefaultWorkspaceForProject(projectId: string, suiteId: string) {
  const testCases = await prisma.testCase.findMany({
    where: { suiteId, enabled: true },
    orderBy: { createdAt: 'asc' },
  });
  const caseIds = testCases.map((testCase) => testCase.id);
  const manualCaseIds = testCases.filter((testCase) => testCase.automation === 'manual').map((testCase) => testCase.id);
  const automatedCaseIds = testCases.filter((testCase) => testCase.automation === 'automated').map((testCase) => testCase.id);
  const enabledIds = new Set(caseIds);

  const packs = [
    { id: `${projectId}-pack-all`, name: 'All Test Cases', kind: 'all', derivedCaseIds: caseIds },
    { id: `${projectId}-pack-smoke`, name: 'Smoke', kind: 'system' },
    { id: `${projectId}-pack-regression`, name: 'Regression', kind: 'system' },
    { id: `${projectId}-pack-manual`, name: 'Manual', kind: 'manual', derivedCaseIds: manualCaseIds },
    { id: `${projectId}-pack-automated`, name: 'Automated', kind: 'automated', derivedCaseIds: automatedCaseIds },
  ];

  for (const pack of packs) {
    const existing = await prisma.testPack.findUnique({ where: { id: pack.id } });
    const existingIds = existing
      ? (JSON.parse(existing.caseIds || '[]') as string[]).filter((caseId) => enabledIds.has(caseId))
      : [];
    const nextCaseIds = 'derivedCaseIds' in pack ? pack.derivedCaseIds : existingIds;
    await prisma.testPack.upsert({
      where: { id: pack.id },
      update: { caseIds: JSON.stringify(nextCaseIds) },
      create: {
        id: pack.id,
        projectId,
        name: pack.name,
        description: `${pack.name} pack managed by Passmark TestOps.`,
        kind: pack.kind,
        owner: 'Local QA Team',
        caseIds: JSON.stringify(nextCaseIds),
      },
    });
  }
}
