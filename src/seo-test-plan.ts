import { askLocalAI } from './local-ai-client';
import { SEO_BASIC_CASES, getSeoCaseDefinition } from './seo-cases';

export type SeoTestPlanCase = {
  code: string;
  name: string;
  enabled: boolean;
  priority: string;
};

export type SeoTestPlan = {
  testType: 'seo-basic';
  url: string;
  cases: SeoTestPlanCase[];
};

type PlanInputCase = {
  code: string;
  name: string;
  enabled: boolean;
  priority: string;
};

function stripJsonFence(value: string): string {
  return value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

export function createDefaultSeoPlan(url: string, cases: PlanInputCase[]): SeoTestPlan {
  const enabledCases = cases.length
    ? cases
    : SEO_BASIC_CASES.map((testCase) => ({
        code: testCase.code,
        name: testCase.name,
        enabled: true,
        priority: testCase.priority,
      }));

  return {
    testType: 'seo-basic',
    url,
    cases: enabledCases
      .filter((testCase) => testCase.enabled)
      .map((testCase) => {
        const definition = getSeoCaseDefinition(testCase.code);

        return {
          code: definition?.code || testCase.code,
          name: definition?.name || testCase.name,
          enabled: true,
          priority: testCase.priority || definition?.priority || 'medium',
        };
      })
      .filter((testCase) => Boolean(getSeoCaseDefinition(testCase.code))),
  };
}

export function validateSeoPlan(value: unknown, url: string, fallbackCases: PlanInputCase[]): SeoTestPlan {
  const defaultPlan = createDefaultSeoPlan(url, fallbackCases);

  if (!value || typeof value !== 'object') {
    return defaultPlan;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.testType !== 'seo-basic' || !Array.isArray(candidate.cases)) {
    return defaultPlan;
  }

  const aiCases = candidate.cases
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return undefined;
      }

      const rawCase = item as Record<string, unknown>;
      const code = typeof rawCase.code === 'string' ? rawCase.code : '';
      const definition = getSeoCaseDefinition(code);

      if (!definition) {
        return undefined;
      }

      return {
        code: definition.code,
        name: definition.name,
        enabled: rawCase.enabled !== false,
        priority: typeof rawCase.priority === 'string' ? rawCase.priority : definition.priority,
      };
    })
    .filter(Boolean) as SeoTestPlanCase[];

  if (!aiCases.length) {
    return defaultPlan;
  }

  const aiCaseByCode = new Map(aiCases.map((testCase) => [testCase.code, testCase]));
  const cases = defaultPlan.cases.map((testCase) => {
    const aiCase = aiCaseByCode.get(testCase.code);

    return {
      ...testCase,
      priority: aiCase?.priority || testCase.priority,
      enabled: true,
    };
  });

  return {
    testType: 'seo-basic',
    url,
    cases,
  };
}

export async function generateSeoTestPlan(
  url: string,
  userRequest: string,
  cases: PlanInputCase[]
): Promise<{
  plan: SeoTestPlan;
  aiPrompt: string;
  aiResponse: string;
  aiStatus: 'passed' | 'fallback';
  durationMs: number;
}> {
  const startedAt = Date.now();
  const availableCases = cases
    .map((testCase) => `${testCase.code}: ${testCase.name} (${testCase.priority})`)
    .join('\n');
  const aiPrompt = `
Return only JSON. No markdown. No explanation.

Create a seo-basic test plan for this URL:
${url}

User request:
${userRequest || 'Run default SEO Basic checks'}

Available cases:
${availableCases}

Use this exact JSON shape:
{
  "testType": "seo-basic",
  "url": "${url}",
  "cases": [
    {
      "code": "SEO-001",
      "name": "Page loads successfully",
      "enabled": true,
      "priority": "high"
    }
  ]
}

Rules:
- Only use available case codes.
- Prefer enabled true for relevant cases.
- Do not generate TypeScript.
`;

  try {
    const aiResponse = await askLocalAI([
      {
        role: 'user',
        content: aiPrompt,
      },
    ]);
    const parsed = JSON.parse(stripJsonFence(aiResponse));

    return {
      plan: validateSeoPlan(parsed, url, cases),
      aiPrompt,
      aiResponse,
      aiStatus: 'passed',
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      plan: createDefaultSeoPlan(url, cases),
      aiPrompt,
      aiResponse: error instanceof Error ? error.message : String(error),
      aiStatus: 'fallback',
      durationMs: Date.now() - startedAt,
    };
  }
}
