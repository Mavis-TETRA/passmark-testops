import fs from 'fs';
import path from 'path';
import { AuthConfig } from '../scripts/generate-playwright-test';
import { SeoTestPlan } from './seo-test-plan';

function codeString(value: string): string {
  return JSON.stringify(value);
}

function isPasswordAuthEnabled(auth?: AuthConfig): boolean {
  return auth?.mode === 'password' && Boolean(auth.loginUrl?.trim());
}

function renderAuthBlock(auth?: AuthConfig): string {
  if (!isPasswordAuthEnabled(auth)) {
    return '';
  }

  return `

const AUTH = {
  loginUrl: ${codeString(auth?.loginUrl?.trim() || '')},
  username: ${codeString(auth?.username?.trim() || '')},
  password: process.env.PASSMARK_AUTH_PASSWORD || '',
  usernameSelector: ${codeString(auth?.usernameSelector?.trim() || 'input[name="email"], input[name="username"], input[type="email"], input[type="text"]')},
  passwordSelector: ${codeString(auth?.passwordSelector?.trim() || 'input[name="password"], input[type="password"]')},
  submitSelector: ${codeString(auth?.submitSelector?.trim() || 'button[type="submit"], input[type="submit"]')},
  successSelector: ${codeString(auth?.successSelector?.trim() || '')},
};

async function login(page) {
  await page.goto(AUTH.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator(AUTH.usernameSelector).first().fill(AUTH.username);
  await page.locator(AUTH.passwordSelector).first().fill(AUTH.password);
  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => undefined),
    page.locator(AUTH.submitSelector).first().click(),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

  if (AUTH.successSelector) {
    await expect(page.locator(AUTH.successSelector).first()).toBeVisible({ timeout: 15000 });
  }
}

test.beforeEach(async ({ page }) => {
  await login(page);
});
`;
}

function renderCase(code: string): string {
  switch (code) {
    case 'SEO-001':
      return `
  test('SEO-001 Page loads successfully', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.+/);
  });
`;
    case 'SEO-002':
      return `
  test('SEO-002 Title exists', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    await expect
      .poll(async () => (await page.title()).trim().length, {
        message: 'Expected the page title to have content',
        timeout: 10000,
      })
      .toBeGreaterThan(0);
  });
`;
    case 'SEO-003':
      return `
  test('SEO-003 Meta description exists', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
    await expect
      .poll(async () => {
        const descriptionContent = await metaDescription.getAttribute('content');
        return descriptionContent?.trim().length || 0;
      }, {
        message: 'Expected the meta description to have content',
        timeout: 10000,
      })
      .toBeGreaterThan(0);
  });
`;
    case 'SEO-004':
      return `
  test('SEO-004 Canonical URL exists', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = await canonical.getAttribute('href');
    expect(href?.trim().length).toBeGreaterThan(0);
  });
`;
    case 'SEO-005':
      return `
  test('SEO-005 Exactly one H1 exists', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    const h1Text = await h1.innerText();
    expect(h1Text.trim().length).toBeGreaterThan(0);
  });
`;
    case 'SEO-006':
      return `
  test('SEO-006 HTML lang exists', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang?.trim().length).toBeGreaterThan(0);
  });
`;
    case 'SEO-007':
      return `
  test('SEO-007 Viewport meta exists', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    const viewportContent = await viewport.getAttribute('content');
    expect(viewportContent?.trim().length).toBeGreaterThan(0);
  });
`;
    default:
      return '';
  }
}

export function renderSeoBasicSpec(plan: SeoTestPlan, auth?: AuthConfig): string {
  const cases = plan.cases
    .filter((testCase) => testCase.enabled)
    .map((testCase) => renderCase(testCase.code))
    .filter(Boolean)
    .join('');

  return `import { test, expect } from '@playwright/test';

const SITE_URL = ${codeString(plan.url)};
${renderAuthBlock(auth)}

test.describe('Basic SEO checks', () => {${cases}
});
`;
}

export function writeSeoBasicSpec(plan: SeoTestPlan, auth?: AuthConfig): {
  outputPath: string;
  code: string;
} {
  const outputPath = path.resolve(process.cwd(), 'tests/generated-seo-basic.spec.ts');
  const code = renderSeoBasicSpec(plan, auth);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, code, 'utf-8');

  return { outputPath, code };
}
