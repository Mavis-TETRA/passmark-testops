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

export async function createDefaultTargetForProject(project: { id: string; baseUrl: string }) {
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
      type: 'web-url',
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
        await createDefaultSuiteForProject(project.id);
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
