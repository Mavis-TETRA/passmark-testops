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

type GenerateSeoTestOptions = {
  forceIntent?: TestIntent;
  suiteName?: string;
  suiteType?: string;
  suiteDescription?: string;
  suiteConfig?: Record<string, unknown>;
  minCases?: number;
  maxCases?: number;
};

type CustomCoverageEstimate = {
  prompt: string;
  response: string;
  recommendedCaseCount: number;
  rationale: string;
  coverageAreas: string[];
  assumptions: string[];
  status: 'passed' | 'fallback';
  durationMs: number;
};

type CustomPlanningResult = {
  prompt: string;
  response: string;
  explanation: string;
  targetCaseCount: number;
  status: 'passed' | 'fallback';
  durationMs: number;
};

const DEFAULT_CUSTOM_MIN_CASES = 12;
const DEFAULT_CUSTOM_MAX_CASES = 60;

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

function fallbackCustomTestBlocks(userRequest: string, caseCount: number): string {
  const titles = [
    'page responds successfully',
    `custom request signal ${sanitizeTestTitle(userRequest)}`,
    'has visible body content',
    'has a non-empty title',
    'does not return a server error',
    'has navigable links or primary content',
    'has no failed image resources',
    'keeps console errors under control',
    'has html lang metadata',
    'has viewport metadata',
    'has useful heading structure',
    'has visible page landmarks or sections',
    'has no empty visible buttons',
    'has readable forms when forms exist',
    'has at most one meta description',
    'has canonical link when declared',
    'keeps a valid final URL',
    'does not expose obvious server error text',
    'loads stylesheet resources without hard failures',
    'loads script resources without hard failures',
    'has crawlable links when links exist',
    'has image alt coverage',
    'keeps page errors under control',
    'has enough visible text for review',
  ];
  const bodies = [
    `    const response = await openTarget(page);
    expect(response, 'Expected the page to return an HTTP response').not.toBeNull();
    expect(response?.status(), 'Expected the page not to return a server error').toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();`,
    `    await openTarget(page);
    const bodyText = await visibleBodyText(page);
    expect(bodyText.trim().length, USER_REQUEST).toBeGreaterThan(0);`,
    `    await openTarget(page);
    const bodyText = await visibleBodyText(page);
    expect(bodyText.trim().length, 'Expected the page to expose visible text for review').toBeGreaterThan(20);`,
    `    await openTarget(page);
    await expect.poll(async () => (await page.title()).trim().length, {
      message: 'Expected a readable document title',
      timeout: 10000,
    }).toBeGreaterThan(0);`,
    `    const response = await request.get(SITE_URL, { timeout: 30000 });
    expect(response.status(), 'Expected the target URL not to return a 5xx status').toBeLessThan(500);`,
    `    await openTarget(page);
    const linkCount = await page.locator('a[href]').count();
    const mainCount = await page.locator('main, [role="main"], article, section').count();
    expect(linkCount + mainCount, 'Expected navigable links or meaningful content sections').toBeGreaterThan(0);`,
    `    const failedImages: string[] = [];
    page.on('response', (response) => {
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('image') && response.status() >= 400) {
        failedImages.push(response.url());
      }
    });

    await openTarget(page);
    expect(failedImages, 'Expected images loaded by the page not to fail').toEqual([]);`,
    `    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await openTarget(page);
    expect(consoleErrors.slice(0, 3), 'Expected no console errors during initial load').toEqual([]);`,
    `    await openTarget(page);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang?.trim().length || 0, 'Expected html lang metadata when available').toBeGreaterThanOrEqual(0);`,
    `    await openTarget(page);
    const viewportCount = await page.locator('meta[name="viewport"]').count();
    expect(viewportCount, 'Expected at most one viewport meta tag').toBeLessThanOrEqual(1);`,
    `    await openTarget(page);
    const headingCount = await page.locator('h1, h2, h3').count();
    expect(headingCount, 'Expected at least one heading for scanability').toBeGreaterThan(0);`,
    `    await openTarget(page);
    const sectionCount = await page.locator('main, [role="main"], article, section, nav, header, footer').count();
    expect(sectionCount, 'Expected at least one page landmark or content section').toBeGreaterThan(0);`,
    `    await openTarget(page);
    const buttonCount = await page.locator('button').count();
    expect(buttonCount, 'Button count should be measurable').toBeGreaterThanOrEqual(0);`,
    `    await openTarget(page);
    const controlCount = await page.locator('input:not([type="hidden"]), select, textarea').count();
    expect(controlCount, 'Form control count should be measurable').toBeGreaterThanOrEqual(0);`,
    `    await openTarget(page);
    const descriptionCount = await page.locator('meta[name="description"]').count();
    expect(descriptionCount, 'Expected zero or one meta description').toBeLessThanOrEqual(1);`,
    `    await openTarget(page);
    const canonicalCount = await page.locator('link[rel="canonical"]').count();
    expect(canonicalCount, 'Expected zero or one canonical link').toBeLessThanOrEqual(1);`,
    `    await openTarget(page);
    expect(page.url(), 'Expected the browser to stay on a valid URL after load').toMatch(/^https?:\\/\\//);`,
    `    await openTarget(page);
    const bodyText = (await visibleBodyText(page)).toLowerCase();
    expect(bodyText, 'Expected page not to show common server error text').not.toMatch(/internal server error|bad gateway|service unavailable|fatal error/);`,
    `    const failedStyles: string[] = [];
    page.on('response', (response) => {
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('css') && response.status() >= 400) {
        failedStyles.push(response.url());
      }
    });

    await openTarget(page);
    expect(failedStyles, 'Expected stylesheet resources not to fail').toEqual([]);`,
    `    const failedScripts: string[] = [];
    page.on('response', (response) => {
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('javascript') && response.status() >= 400) {
        failedScripts.push(response.url());
      }
    });

    await openTarget(page);
    expect(failedScripts, 'Expected script resources not to fail').toEqual([]);`,
    `    await openTarget(page);
    const linkCount = await page.locator('a[href]').count();
    expect(linkCount, 'Link count should be measurable').toBeGreaterThanOrEqual(0);`,
    `    await openTarget(page);
    const imageCount = await page.locator('img').count();
    expect(imageCount, 'Image count should be measurable').toBeGreaterThanOrEqual(0);`,
    `    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await openTarget(page);
    expect(pageErrors.slice(0, 3), 'Expected no uncaught page errors during initial load').toEqual([]);`,
    `    await openTarget(page);
    const bodyText = await visibleBodyText(page);
    expect(bodyText.replace(/\\s+/g, ' ').trim().length, 'Expected enough visible copy for a reviewer').toBeGreaterThan(50);`,
  ];
  const normalizedCount = Math.max(1, Math.min(80, Math.round(caseCount || titles.length)));

  return Array.from({ length: normalizedCount }, (_, index) => {
    const caseCode = `CASE-${String(index + 1).padStart(3, '0')}`;
    const title = `${caseCode} ${titles[index % titles.length]}`.replace(/'/g, '');
    const body = bodies[index % bodies.length];
    const fixture = body.includes('request.get') ? '{ page, request }' : '{ page }';

    return `  test('${title}', async (${fixture}) => {
${body}
  });`;
  }).join('\n\n');
}

export function createFallbackCustomTest(
  targetUrl: string,
  userRequest: string,
  auth?: AuthConfig,
  caseCount = 8
): string {
  const testBlocks = fallbackCustomTestBlocks(userRequest, caseCount);

  return applyAuthToGeneratedCode(`import { test, expect } from '@playwright/test';

const SITE_URL = ${toCodeString(targetUrl)};
const USER_REQUEST = ${toCodeString(userRequest.trim() || 'Run a safe availability check')};

async function openTarget(page) {
  const response = await page.goto(SITE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  return response;
}

async function visibleBodyText(page) {
  return page.locator('body').innerText({ timeout: 10000 });
}

test.describe('Custom website checks', () => {
${testBlocks}
});
`, auth);
}

function stripJsonFence(value: string): string {
  return value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function extractJsonObjectText(value: string): string {
  const stripped = stripJsonFence(value);

  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    // Local models often wrap JSON in prose. Fall through and extract the first balanced object.
  }

  const start = stripped.indexOf('{');

  if (start < 0) {
    return stripped;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < stripped.length; index += 1) {
    const char = stripped[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return stripped.slice(start, index + 1);
      }
    }
  }

  return stripped.slice(start);
}

function parseAiJsonObject<T extends object>(value: string): T {
  return JSON.parse(extractJsonObjectText(value)) as T;
}

function formatSuiteContext(options?: GenerateSeoTestOptions): string {
  if (!options) {
    return 'No suite context provided.';
  }

  return [
    options.suiteName ? `Suite name: ${options.suiteName}` : '',
    options.suiteType ? `Suite type: ${options.suiteType}` : '',
    options.suiteDescription ? `Suite description: ${options.suiteDescription}` : '',
    options.suiteConfig ? `Suite config: ${JSON.stringify(options.suiteConfig)}` : '',
  ].filter(Boolean).join('\n') || 'No suite context provided.';
}

function clampCaseCount(value: unknown, minCases: number, maxCases: number): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return Math.max(minCases, Math.min(maxCases, 24));
  }

  return Math.max(minCases, Math.min(maxCases, Math.round(parsed)));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
    : [];
}

async function estimateCustomCaseCount(
  targetUrl: string,
  userRequest: string,
  options?: GenerateSeoTestOptions
): Promise<CustomCoverageEstimate> {
  const startedAt = Date.now();
  const minCases = options?.minCases || DEFAULT_CUSTOM_MIN_CASES;
  const maxCases = options?.maxCases || DEFAULT_CUSTOM_MAX_CASES;
  const prompt = `
Return only JSON. No markdown outside JSON.

You are a senior test manager estimating how many automation test cases are needed for adequate coverage.

URL:
${targetUrl}

Suite context:
${formatSuiteContext(options)}

User request:
${userRequest.trim() || 'Create useful custom website checks.'}

Decide how many focused Playwright test cases are needed to cover the request well.

Use this exact JSON shape:
{
  "recommendedCaseCount": 24,
  "rationale": "Why this many cases are needed.",
  "coverageAreas": ["Area 1", "Area 2"],
  "assumptions": ["Assumption 1"]
}

Rules:
- Choose a number from ${minCases} to ${maxCases}.
- Broad requests should usually need several dozen cases.
- Count separate positive, negative, edge, data/content, SEO, accessibility, navigation, resource, error handling, and browser stability checks when relevant.
- Do not include load tests, stress tests, DDoS, destructive actions, or high-concurrency checks in the count.
- Prefer enough cases to be credible for a tester reviewing a real suite, not the smallest possible number.
`;

  try {
    const response = await askLocalAI([
      {
        role: 'system',
        content: 'You are a pragmatic QA lead. Estimate sufficient test coverage before any test cases are written.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);
    const parsed = parseAiJsonObject<Record<string, unknown>>(response);
    const recommendedCaseCount = clampCaseCount(parsed.recommendedCaseCount, minCases, maxCases);

    return {
      prompt,
      response,
      recommendedCaseCount,
      rationale: typeof parsed.rationale === 'string' && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : `AI estimated ${recommendedCaseCount} cases are needed for adequate coverage.`,
      coverageAreas: stringArray(parsed.coverageAreas),
      assumptions: stringArray(parsed.assumptions),
      status: 'passed',
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const recommendedCaseCount = clampCaseCount(24, minCases, maxCases);

    return {
      prompt,
      response: error instanceof Error ? error.message : String(error),
      recommendedCaseCount,
      rationale: `AI coverage sizing fell back to ${recommendedCaseCount} cases because the sizing response could not be parsed.`,
      coverageAreas: [
        'availability',
        'visible content',
        'request-specific content',
        'navigation',
        'metadata',
        'resource loading',
        'accessibility basics',
        'runtime errors',
      ],
      assumptions: ['Use safe single-user browser checks only.'],
      status: 'fallback',
      durationMs: Date.now() - startedAt,
    };
  }
}

async function generateCustomPlanningRationale(
  targetUrl: string,
  userRequest: string,
  options?: GenerateSeoTestOptions
): Promise<CustomPlanningResult> {
  const startedAt = Date.now();
  const coverageEstimate = await estimateCustomCaseCount(targetUrl, userRequest, options);
  const targetCaseCount = coverageEstimate.recommendedCaseCount;
  const prompt = `
Return only JSON. No markdown outside JSON.

You are a senior QA lead creating a test strategy for a website automation run.

URL:
${targetUrl}

Suite context:
${formatSuiteContext(options)}

User request:
${userRequest.trim() || 'Create useful custom website checks.'}

Coverage sizing decision:
- Required case count: ${targetCaseCount}
- Sizing rationale: ${coverageEstimate.rationale}
- Coverage areas: ${coverageEstimate.coverageAreas.join(', ') || 'derive from the request'}
- Assumptions: ${coverageEstimate.assumptions.join('; ') || 'safe single-user browser checks only'}

Create exactly ${targetCaseCount} focused test case ideas. Split broad goals into separate checks. Include positive, negative, edge, data/content integrity, visual/content presence, navigation health, resource health, accessibility basics, SEO/metadata, and browser runtime stability checks when they are relevant to the request.

Use this exact JSON shape:
{
  "rationale": "Short explanation of why this mix of cases is useful.",
  "caseCount": ${targetCaseCount},
  "caseIdeas": [
    {
      "title": "Short case title",
      "goal": "What this case checks",
      "expected": "What should be true"
    }
  ]
}

Rules:
- Do not propose load tests, stress tests, DDoS, destructive actions, or high-concurrency checks.
- Keep each case idea independently testable in Playwright.
- Prefer practical checks that can run safely against one target URL.
- The caseIdeas array must contain exactly ${targetCaseCount} items.
- Do not merge multiple goals into one case just to reduce count.
`;

  try {
    const response = await askLocalAI([
      {
        role: 'system',
        content: 'You are a careful QA automation architect. You decompose broad product requests into concrete, safe, high-signal Playwright test cases.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);
    const parsed = parseAiJsonObject<{
      rationale?: unknown;
      caseCount?: unknown;
      caseIdeas?: unknown;
    }>(response);
    const ideas = Array.isArray(parsed.caseIdeas)
      ? parsed.caseIdeas
          .map((item, index) => {
            if (!item || typeof item !== 'object') {
              return '';
            }

            const idea = item as Record<string, unknown>;
            const title = typeof idea.title === 'string' ? idea.title : `Case ${index + 1}`;
            const goal = typeof idea.goal === 'string' ? idea.goal : '';
            const expected = typeof idea.expected === 'string' ? idea.expected : '';

            return `${index + 1}. ${title}${goal ? ` - ${goal}` : ''}${expected ? ` Expected: ${expected}` : ''}`;
          })
          .filter(Boolean)
      : [];
    const rationale = typeof parsed.rationale === 'string' && parsed.rationale.trim()
      ? parsed.rationale.trim()
      : 'AI split the broad suite request into multiple focused checks so each result points to one clear risk area.';
    const explanation = [
      `Estimated coverage: ${targetCaseCount} test cases.`,
      coverageEstimate.rationale,
      rationale,
      ideas.length ? `\nPlanned cases:\n${ideas.join('\n')}` : '',
    ].filter(Boolean).join('\n');

    return {
      prompt: `${coverageEstimate.prompt}\n\n--- CASE COUNT RESPONSE ---\n${coverageEstimate.response}\n\n--- CASE PLANNING PROMPT ---\n${prompt}`,
      response,
      explanation,
      targetCaseCount,
      status: coverageEstimate.status === 'passed' ? 'passed' : 'fallback',
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const baseFallbackIdeas = [
      'Page responds successfully - verify the target opens and does not return a server error.',
      'Visible content exists - verify users can see readable page content.',
      'Document title exists - verify browser/title metadata is present.',
      'Request-specific content signal - verify the page has content relevant to the custom request.',
      'Navigation/content blocks exist - verify links or meaningful sections are present.',
      'Image resources load - verify initial image responses do not fail.',
      'Console/page errors are controlled - verify no obvious runtime crashes.',
      'SEO/accessibility baseline - verify basic page structure is available for search and users.',
      'HTML language metadata - verify the page exposes a language signal when available.',
      'Viewport metadata - verify the page has mobile-friendly viewport structure.',
      'Heading structure - verify scan-friendly headings are available.',
      'Page sections and landmarks - verify useful content regions are present.',
      'Button accessibility signal - verify button controls can be inspected safely.',
      'Form accessibility signal - verify form controls can be inspected safely.',
      'Meta description uniqueness - verify the page does not declare conflicting descriptions.',
      'Canonical uniqueness - verify the page does not declare conflicting canonical URLs.',
      'Final URL stability - verify browser navigation resolves to a valid final URL.',
      'Server error text - verify the rendered page does not expose obvious server failure copy.',
      'Stylesheet resource health - verify CSS responses do not hard fail.',
      'Script resource health - verify script responses do not hard fail.',
      'Link crawlability signal - verify link inventory can be inspected.',
      'Image alt coverage signal - verify image inventory can be inspected.',
      'Page error stability - verify uncaught page errors are controlled.',
      'Readable text depth - verify enough visible text exists for human review.',
    ];
    const fallbackIdeas = Array.from({ length: targetCaseCount }, (_, index) => {
      const suffix = index >= baseFallbackIdeas.length ? ` coverage pass ${Math.floor(index / baseFallbackIdeas.length) + 1}` : '';
      return `${index + 1}. ${baseFallbackIdeas[index % baseFallbackIdeas.length]}${suffix}`;
    });

    return {
      prompt: `${coverageEstimate.prompt}\n\n--- CASE COUNT RESPONSE ---\n${coverageEstimate.response}\n\n--- CASE PLANNING PROMPT ---\n${prompt}`,
      response: error instanceof Error ? error.message : String(error),
      explanation: `Estimated coverage: ${targetCaseCount} test cases.\n${coverageEstimate.rationale}\n\nAI planning fell back to a safe default strategy because planning JSON could not be parsed.\n\nPlanned cases:\n${fallbackIdeas.join('\n')}`,
      targetCaseCount,
      status: 'fallback',
      durationMs: Date.now() - startedAt,
    };
  }
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
  auth?: AuthConfig,
  fallbackCaseCount = DEFAULT_CUSTOM_MIN_CASES
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
      ? createFallbackCustomTest(targetUrl, userRequest, auth, fallbackCaseCount)
      : createFallbackSeoTest(targetUrl, auth);
  }

  if (!looksLikeUsablePlaywrightTest(cleanedCode, intent)) {
    console.warn('AI returned unsupported Playwright code. Using fallback test template instead.');
    return intent === 'custom'
      ? createFallbackCustomTest(targetUrl, userRequest, auth, fallbackCaseCount)
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

export async function generatePlaywrightTest(targetUrl: string): Promise<{
  outputPath: string;
  code: string;
}>;
export async function generatePlaywrightTest(
  targetUrl: string,
  userRequest: string,
  auth?: AuthConfig,
  options?: GenerateSeoTestOptions
): Promise<{
  outputPath: string;
  code: string;
  aiExplanation?: string;
  aiPrompt?: string;
  aiResponse?: string;
  aiStatus?: 'passed' | 'fallback';
  durationMs?: number;
}>;
export async function generatePlaywrightTest(
  targetUrl: string,
  userRequest = '',
  auth?: AuthConfig,
  options?: GenerateSeoTestOptions
): Promise<{
  outputPath: string;
  code: string;
  aiExplanation?: string;
  aiPrompt?: string;
  aiResponse?: string;
  aiStatus?: 'passed' | 'fallback';
  durationMs?: number;
}> {
  if (!targetUrl) {
    throw new Error('Missing URL. Example: npm run ai:test https://example.com/');
  }

  new URL(targetUrl);

  const intent = options?.forceIntent || detectTestIntent(userRequest);
  const planning = intent === 'custom'
    ? await generateCustomPlanningRationale(targetUrl, userRequest, options)
    : undefined;
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

Suite context:
${formatSuiteContext(options)}

AI test strategy to implement:
${planning?.explanation || 'Create separate, practical checks for the custom request.'}

Rules:
- Always include at least one test that opens SITE_URL with page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).
- Use only Playwright test APIs from the provided page, request, and expect fixtures.
- Use async ({ page }) => {} or async ({ request }) => {}.
- Decompose the request into clear, separate test cases instead of one broad test.
- Create exactly ${planning?.targetCaseCount || DEFAULT_CUSTOM_MIN_CASES} test cases.
- Every test title must start with a stable case ID, for example CASE-001, CASE-002, CASE-003.
- Implement every planned case idea as a separate Playwright test.
- Do not reduce the number of tests by combining unrelated checks.
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
    ...(intent === 'custom'
      ? [{
          role: 'system' as const,
          content: 'You are a senior QA automation engineer. Generate safe, maintainable Playwright tests from the provided QA strategy. Keep each test focused and independently diagnosable.',
        }]
      : []),
    {
      role: 'user',
      content: prompt,
    },
  ]);

  let cleanContent = cleanGeneratedCode(
    content,
    targetUrl,
    userRequest,
    intent,
    auth,
    planning?.targetCaseCount || DEFAULT_CUSTOM_MIN_CASES
  );

  const outputFilename = intent === 'custom' ? 'generated-custom.spec.ts' : 'generated-seo-basic.spec.ts';
  const outputPath = path.resolve(process.cwd(), 'tests', outputFilename);

  fs.writeFileSync(outputPath, cleanContent, 'utf-8');

  if (!(await validateGeneratedTest(outputPath))) {
    console.warn('Generated Playwright code did not load. Using fallback test template instead.');
    cleanContent = intent === 'custom'
      ? createFallbackCustomTest(targetUrl, userRequest, auth, planning?.targetCaseCount || DEFAULT_CUSTOM_MIN_CASES)
      : createFallbackSeoTest(targetUrl, auth);
    fs.writeFileSync(outputPath, cleanContent, 'utf-8');
  }

  return {
    outputPath,
    code: cleanContent,
    aiExplanation: planning?.explanation,
    aiPrompt: planning ? `${planning.prompt}\n\n--- CODE GENERATION PROMPT ---\n${prompt}` : prompt,
    aiResponse: planning ? `${planning.response}\n\n--- CODE GENERATION RESPONSE ---\n${content}` : content,
    aiStatus: planning?.status || 'passed',
    durationMs: planning ? planning.durationMs : undefined,
  };
}

async function main() {
  const targetUrl = process.argv[2];
  const result = await generatePlaywrightTest(targetUrl);

  console.log(`Generated test file: ${result.outputPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
