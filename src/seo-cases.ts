export type SeoCaseCode =
  | 'SEO-001'
  | 'SEO-002'
  | 'SEO-003'
  | 'SEO-004'
  | 'SEO-005'
  | 'SEO-006'
  | 'SEO-007';

export type SeoCaseDefinition = {
  code: SeoCaseCode;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedResult: string;
};

export const SEO_BASIC_CASES: SeoCaseDefinition[] = [
  {
    code: 'SEO-001',
    name: 'Page loads successfully',
    description: 'Open the target URL and verify that the browser reaches a valid page.',
    priority: 'high',
    expectedResult: 'The page should load and expose a valid URL.',
  },
  {
    code: 'SEO-002',
    name: 'Title exists',
    description: 'Verify that the document title is present and non-empty.',
    priority: 'high',
    expectedResult: 'The document title should contain text.',
  },
  {
    code: 'SEO-003',
    name: 'Meta description exists',
    description: 'Verify that one meta description tag exists and has content.',
    priority: 'high',
    expectedResult: 'Exactly one meta description should exist with non-empty content.',
  },
  {
    code: 'SEO-004',
    name: 'Canonical URL exists',
    description: 'Verify that the page declares a canonical link.',
    priority: 'medium',
    expectedResult: 'A canonical link should exist and have a non-empty href.',
  },
  {
    code: 'SEO-005',
    name: 'Exactly one H1 exists',
    description: 'Verify that the page has exactly one H1 with visible text.',
    priority: 'medium',
    expectedResult: 'Exactly one H1 should exist and contain text.',
  },
  {
    code: 'SEO-006',
    name: 'HTML lang exists',
    description: 'Verify that the html element declares a language.',
    priority: 'medium',
    expectedResult: 'The html lang attribute should be non-empty.',
  },
  {
    code: 'SEO-007',
    name: 'Viewport meta exists',
    description: 'Verify that mobile viewport metadata is present.',
    priority: 'medium',
    expectedResult: 'One viewport meta tag should exist and have content.',
  },
];

export function getSeoCaseDefinition(code: string): SeoCaseDefinition | undefined {
  return SEO_BASIC_CASES.find((testCase) => testCase.code === code);
}
