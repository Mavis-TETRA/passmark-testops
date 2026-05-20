import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { askLocalAI } from '../src/local-ai-client';

const execFileAsync = promisify(execFile);

function toCodeString(value: string): string {
  return JSON.stringify(value);
}

function sanitizeTestTitle(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/'/g, '')
    .trim()
    .slice(0, 90) || 'custom request';
}

type TestIntent = 'seo' | 'custom';

export type AuthConfig = {
  mode?: 'none' | 'password';
  loginUrl?: string;
  username?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  successSelector?: string;
};

function detectTestIntent(userRequest: string): TestIntent {
  const normalizedRequest = userRequest.toLowerCase();
  const seoKeywords = [
    'seo',
    'title',
    'meta',
    'description',
    'canonical',
    'h1',
    'heading',
    'open graph',
    'og:',
    'robots',
    'schema',
    'structured data',
    'sitemap',
    'alt',
  ];

  if (!normalizedRequest.trim()) {
    return 'seo';
  }

  return seoKeywords.some((keyword) => normalizedRequest.includes(keyword))
    ? 'seo'
    : 'custom';
}

function isPasswordAuthEnabled(auth?: AuthConfig): boolean {
  return auth?.mode === 'password' && Boolean(auth.loginUrl?.trim());
}

function createAuthBlock(auth?: AuthConfig): string {
  if (!isPasswordAuthEnabled(auth)) {
    return '';
  }

  return `

const AUTH = {
  loginUrl: ${toCodeString(auth?.loginUrl?.trim() || '')},
  username: ${toCodeString(auth?.username?.trim() || '')},
  password: process.env.PASSMARK_AUTH_PASSWORD || '',
  usernameSelector: ${toCodeString(auth?.usernameSelector?.trim() || 'input[name="email"], input[name="username"], input[type="email"], input[type="text"]')},
  passwordSelector: ${toCodeString(auth?.passwordSelector?.trim() || 'input[name="password"], input[type="password"]')},
  submitSelector: ${toCodeString(auth?.submitSelector?.trim() || 'button[type="submit"], input[type="submit"]')},
  successSelector: ${toCodeString(auth?.successSelector?.trim() || '')},
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

function applyAuthToGeneratedCode(code: string, auth?: AuthConfig): string {
  const authBlock = createAuthBlock(auth);

  if (!authBlock || code.includes('test.beforeEach(async ({ page }) => {')) {
    return code;
  }

  const siteUrlPattern = /const SITE_URL = .*?;\s*/;
  const match = siteUrlPattern.exec(code);

  if (!match) {
    return code;
  }

  return `${code.slice(0, match.index + match[0].length)}${authBlock}${code.slice(match.index + match[0].length)}`;
}

export function createFallbackSeoTest(targetUrl: string, auth?: AuthConfig): string {
  return applyAuthToGeneratedCode(`import { test, expect } from '@playwright/test';

const SITE_URL = ${toCodeString(targetUrl)};

test.describe('Basic SEO checks', () => {
  test('page loads successfully', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/.+/);
  });

  test('has title', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

    await expect
      .poll(async () => (await page.title()).trim().length, {
        message: 'Expected the page title to have content',
        timeout: 10000,
      })
      .toBeGreaterThan(0);
  });

  test('has meta description', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
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

  test('has canonical URL', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);

    const href = await canonical.getAttribute('href');
    expect(href?.trim().length).toBeGreaterThan(0);
  });

  test('has exactly one H1', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);

    const h1Text = await h1.innerText();
    expect(h1Text.trim().length).toBeGreaterThan(0);
  });

  test('has html lang and viewport meta', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang?.trim().length).toBeGreaterThan(0);

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);

    const viewportContent = await viewport.getAttribute('content');
    expect(viewportContent?.trim().length).toBeGreaterThan(0);
  });
});
`, auth);
}

export function createFallbackCustomTest(targetUrl: string, userRequest: string, auth?: AuthConfig): string {
  const title = sanitizeTestTitle(userRequest);

  return applyAuthToGeneratedCode(`import { test, expect } from '@playwright/test';

const SITE_URL = ${toCodeString(targetUrl)};
const USER_REQUEST = ${toCodeString(userRequest.trim() || 'Run a safe availability check')};

test.describe('Custom website checks', () => {
  test('page responds successfully', async ({ page }) => {
    const response = await page.goto(SITE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    expect(response, 'Expected the page to return an HTTP response').not.toBeNull();
    expect(response?.status(), 'Expected the page not to return a server error').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('custom request: ${title}', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(SITE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

    const bodyText = await page.locator('body').innerText({ timeout: 10000 });
    expect(bodyText.trim().length, USER_REQUEST).toBeGreaterThan(0);
    expect(pageErrors, 'Expected no uncaught page errors while checking the request').toEqual([]);
  });
});
`, auth);
}

function getBlockedPatterns(): RegExp[] {
  return [
    /\bcreatePlaywrightTests\b/,
    /\bchromium\.launch\b/,
    /\bexpect\.error\b/,
    /\bpage\.evaluate\b/,
    /\bpage\.\$\$/,
    /\bdocument\./,
    /\bpage\.metaDescription\b/,
    /\bpage\.canonicalUrl\b/,
    /\bgetViewportMetaAttribute\b/,
    /\bhtmlLanguageAt\b/,
    /\bwhile\s*\(\s*true\s*\)/,
    /\bfor\s*\(\s*;\s*;\s*\)/,
  ];
}

function looksLikeUsablePlaywrightTest(code: string, mode: 'seo' | 'custom'): boolean {
  const blockedPatterns = [
    ...getBlockedPatterns(),
    /has title and meta description/i,
  ];
  const seoRequiredPatterns = [
    /has title/i,
    /has meta description/i,
    /page\.locator\('meta\[name="description"\]'\)/,
    /page\.locator\('link\[rel="canonical"\]'\)/,
    /page\.locator\('h1'\)/,
    /page\.locator\('html'\)/,
    /page\.locator\('meta\[name="viewport"\]'\)/,
  ];

  return (
    code.includes("import { test, expect } from '@playwright/test';") &&
    /\btest(?:\.describe)?\s*\(/.test(code) &&
    /\bpage\.goto\s*\(\s*SITE_URL/.test(code) &&
    !blockedPatterns.some((pattern) => pattern.test(code)) &&
    (mode === 'custom' || seoRequiredPatterns.every((pattern) => pattern.test(code)))
  );
}

export function cleanGeneratedCode(
  code: string,
  targetUrl: string,
  userRequest = '',
  intent: TestIntent = detectTestIntent(userRequest),
  auth?: AuthConfig
): string {
  let cleanedCode = code
    .replace(/^\s*```(?:typescript|ts|javascript|js)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/```(?:typescript|ts|javascript|js)?/gi, '')
    .replace(/```/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();

  const importText = "import { test, expect } from '@playwright/test';";
  const importIndex = cleanedCode.indexOf(importText);

  if (importIndex >= 0) {
    cleanedCode = cleanedCode.slice(importIndex).trim();
  }

  if (!cleanedCode.startsWith(importText)) {
    console.warn('AI returned invalid TypeScript. Using fallback test template instead.');
    return intent === 'custom'
      ? createFallbackCustomTest(targetUrl, userRequest, auth)
      : createFallbackSeoTest(targetUrl, auth);
  }

  if (!looksLikeUsablePlaywrightTest(cleanedCode, intent)) {
    console.warn('AI returned unsupported Playwright code. Using fallback test template instead.');
    return intent === 'custom'
      ? createFallbackCustomTest(targetUrl, userRequest, auth)
      : createFallbackSeoTest(targetUrl, auth);
  }

  return applyAuthToGeneratedCode(cleanedCode, auth);
}

async function validateGeneratedTest(outputPath: string): Promise<boolean> {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    await execFileAsync(
      npxCommand,
      ['playwright', 'test', outputPath, '--project=chromium', '--list'],
      {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024,
      }
    );
    return true;
  } catch {
    return false;
  }
}

export async function generateSeoTest(targetUrl: string): Promise<{
  outputPath: string;
  code: string;
}>;
export async function generateSeoTest(
  targetUrl: string,
  userRequest: string,
  auth?: AuthConfig
): Promise<{
  outputPath: string;
  code: string;
}>;
export async function generateSeoTest(
  targetUrl: string,
  userRequest = '',
  auth?: AuthConfig
): Promise<{
  outputPath: string;
  code: string;
}> {
  if (!targetUrl) {
    throw new Error('Missing URL. Example: npm run ai:seo https://example.com/');
  }

  new URL(targetUrl);

  const intent = detectTestIntent(userRequest);
  const prompt = intent === 'custom' ? `
Return only valid TypeScript code.

No explanation.
No markdown.
No code fences.
No prose before or after the code.

Use exactly this import:
import { test, expect } from '@playwright/test';

Use this URL:
const SITE_URL = ${toCodeString(targetUrl)};

Create a practical set of Playwright test cases based on this user request:
${userRequest.trim()}

Rules:
- Always include at least one test that opens SITE_URL with page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).
- Use only Playwright test APIs from the provided page, request, and expect fixtures.
- Use async ({ page }) => {} or async ({ request }) => {}.
- Decompose the request into clear, separate test cases instead of one broad test.
- Create 2 to 8 test cases depending on the request complexity.
- Prefer locators, response status checks, URL checks, text checks, header checks, console/pageerror checks, and timing checks.
- Do not generate load tests, DDoS tests, infinite loops, high concurrency, stress traffic, or destructive actions.
- If the request asks for DDoS, convert it into a safe availability/resilience check using one browser request and basic HTTP status assertions.
- Do not import chromium.
- Do not call chromium.launch().
- Do not use page.evaluate().
- Do not use document.
- Do not use backticks.
- Use straight single quotes only.
` : `
Return only valid TypeScript code.

No explanation.
No markdown.
No code fences.
No prose before or after the code.

Use exactly this import:
import { test, expect } from '@playwright/test';

Use this URL:
const SITE_URL = ${toCodeString(targetUrl)};

Create Playwright tests for:
- page loads successfully
- title exists
- meta description exists
- canonical URL exists
- exactly one H1 exists
- html lang exists
- viewport meta exists
${userRequest.trim() ? `\nAdditional SEO request:\n${userRequest.trim()}\n` : ''}

Rules:
- Use async ({ page }) => {}.
- Keep title and meta description in separate tests.
- Wait for networkidle after page.goto with { timeout: 5000 }, but catch and ignore networkidle timeout.
- Use expect.poll for title and meta description content checks.
- Do not import chromium.
- Do not call chromium.launch().
- Do not use backticks.
- Use straight single quotes only.
`;

  const content = await askLocalAI([
    {
      role: 'user',
      content: prompt,
    },
  ]);

  let cleanContent = cleanGeneratedCode(content, targetUrl, userRequest, intent, auth);

  const outputPath = path.resolve(process.cwd(), 'tests/generated-seo.spec.ts');

  fs.writeFileSync(outputPath, cleanContent, 'utf-8');

  if (!(await validateGeneratedTest(outputPath))) {
    console.warn('Generated Playwright code did not load. Using fallback test template instead.');
    cleanContent = intent === 'custom'
      ? createFallbackCustomTest(targetUrl, userRequest, auth)
      : createFallbackSeoTest(targetUrl, auth);
    fs.writeFileSync(outputPath, cleanContent, 'utf-8');
  }

  return {
    outputPath,
    code: cleanContent,
  };
}

async function main() {
  const targetUrl = process.argv[2];
  const result = await generateSeoTest(targetUrl);

  console.log(`Generated test file: ${result.outputPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
