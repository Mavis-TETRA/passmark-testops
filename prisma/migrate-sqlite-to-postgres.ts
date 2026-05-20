import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { prisma } from '../src/db';

type SqliteRow = Record<string, unknown>;

const tableOrder = [
  'Project',
  'Environment',
  'TestSuite',
  'TestCase',
  'TestRun',
  'TestResult',
  'Artifact',
  'AIRequestLog',
] as const;

function toStringValue(value: unknown, fallback = ''): string {
  return value === null || value === undefined ? fallback : String(value);
}

function toOptionalString(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : String(value);
}

function toIntValue(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : fallback;
}

function toBooleanValue(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
  return fallback;
}

function toDateValue(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  const date = new Date(toStringValue(value));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function readTable(database: initSqlJs.Database, tableName: string): SqliteRow[] {
  const exists = database.exec(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${tableName.replace(/'/g, "''")}'`,
  );

  if (exists.length === 0 || exists[0].values.length === 0) {
    return [];
  }

  const result = database.exec(`SELECT * FROM "${tableName}"`);
  if (result.length === 0) {
    return [];
  }

  const columns = result[0].columns;
  return result[0].values.map((values) =>
    columns.reduce<SqliteRow>((row, column, index) => {
      row[column] = values[index];
      return row;
    }, {}),
  );
}

async function createMany(tableName: (typeof tableOrder)[number], rows: SqliteRow[], dryRun: boolean) {
  console.log(`${dryRun ? '[dry-run] ' : ''}${tableName}: ${rows.length} record(s)`);

  if (dryRun || rows.length === 0) {
    return;
  }

  if (tableName === 'Project') {
    await prisma.project.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        name: toStringValue(row.name),
        description: toStringValue(row.description),
        baseUrl: toStringValue(row.baseUrl),
        environment: toStringValue(row.environment, 'production'),
        createdAt: toDateValue(row.createdAt),
        updatedAt: toDateValue(row.updatedAt),
      })),
      skipDuplicates: true,
    });
  }

  if (tableName === 'Environment') {
    await prisma.environment.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        projectId: toStringValue(row.projectId),
        name: toStringValue(row.name),
        baseUrl: toStringValue(row.baseUrl),
        authType: toStringValue(row.authType, 'none'),
        authConfig: toStringValue(row.authConfig, '{}'),
        customHeaders: toStringValue(row.customHeaders, '{}'),
        createdAt: toDateValue(row.createdAt),
        updatedAt: toDateValue(row.updatedAt),
      })),
      skipDuplicates: true,
    });
  }

  if (tableName === 'TestSuite') {
    await prisma.testSuite.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        projectId: toStringValue(row.projectId),
        name: toStringValue(row.name),
        type: toStringValue(row.type),
        description: toStringValue(row.description),
        config: toStringValue(row.config, '{}'),
        enabled: toBooleanValue(row.enabled),
        createdAt: toDateValue(row.createdAt),
        updatedAt: toDateValue(row.updatedAt),
      })),
      skipDuplicates: true,
    });
  }

  if (tableName === 'TestCase') {
    await prisma.testCase.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        suiteId: toStringValue(row.suiteId),
        code: toStringValue(row.code),
        name: toStringValue(row.name),
        description: toStringValue(row.description),
        priority: toStringValue(row.priority, 'medium'),
        enabled: toBooleanValue(row.enabled),
        expectedResult: toStringValue(row.expectedResult),
        createdAt: toDateValue(row.createdAt),
        updatedAt: toDateValue(row.updatedAt),
      })),
      skipDuplicates: true,
    });
  }

  if (tableName === 'TestRun') {
    await prisma.testRun.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        projectId: toOptionalString(row.projectId),
        suiteId: toOptionalString(row.suiteId),
        environmentId: toOptionalString(row.environmentId),
        url: toStringValue(row.url),
        status: toStringValue(row.status),
        total: toIntValue(row.total),
        passed: toIntValue(row.passed),
        failed: toIntValue(row.failed),
        skipped: toIntValue(row.skipped),
        durationMs: toIntValue(row.durationMs),
        generatedSpecPath: toStringValue(row.generatedSpecPath),
        rawOutputPath: toStringValue(row.rawOutputPath),
        userRequest: toStringValue(row.userRequest),
        stdout: toStringValue(row.stdout),
        stderr: toStringValue(row.stderr),
        generatedCode: toStringValue(row.generatedCode),
        createdAt: toDateValue(row.createdAt),
      })),
      skipDuplicates: true,
    });
  }

  if (tableName === 'TestResult') {
    await prisma.testResult.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        runId: toStringValue(row.runId),
        caseCode: toStringValue(row.caseCode),
        caseName: toStringValue(row.caseName),
        status: toStringValue(row.status),
        durationMs: toIntValue(row.durationMs),
        errorMessage: toStringValue(row.errorMessage),
        stackTrace: toStringValue(row.stackTrace),
        expectedResult: toStringValue(row.expectedResult),
        aiDiagnosis: toStringValue(row.aiDiagnosis),
      })),
      skipDuplicates: true,
    });
  }

  if (tableName === 'Artifact') {
    await prisma.artifact.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        runId: toStringValue(row.runId),
        resultId: toOptionalString(row.resultId),
        type: toStringValue(row.type),
        path: toStringValue(row.path),
        createdAt: toDateValue(row.createdAt),
      })),
      skipDuplicates: true,
    });
  }

  if (tableName === 'AIRequestLog') {
    await prisma.aIRequestLog.createMany({
      data: rows.map((row) => ({
        id: toStringValue(row.id),
        provider: toStringValue(row.provider),
        model: toStringValue(row.model),
        prompt: toStringValue(row.prompt),
        response: toStringValue(row.response),
        status: toStringValue(row.status),
        durationMs: toIntValue(row.durationMs),
        createdAt: toDateValue(row.createdAt),
      })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const explicitPathIndex = process.argv.indexOf('--sqlite');
  const sqlitePath =
    explicitPathIndex >= 0 && process.argv[explicitPathIndex + 1]
      ? path.resolve(process.argv[explicitPathIndex + 1])
      : path.join(process.cwd(), 'storage', 'passmark.db');

  if (!fs.existsSync(sqlitePath)) {
    console.log(`SQLite database not found: ${sqlitePath}`);
    console.log('Nothing to migrate. Run db:seed after PostgreSQL migration to create default data.');
    return;
  }

  const SQL = await initSqlJs();
  const database = new SQL.Database(fs.readFileSync(sqlitePath));

  try {
    for (const tableName of tableOrder) {
      await createMany(tableName, readTable(database, tableName), dryRun);
    }
  } finally {
    database.close();
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
