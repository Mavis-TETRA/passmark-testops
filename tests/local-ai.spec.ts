import { test, expect } from '@playwright/test';

test('local AI server should respond', async ({ request }) => {
  const baseUrl = process.env.LOCAL_AI_BASE_URL?.replace(/\/+$/, '');
  const apiKey = process.env.LOCAL_AI_API_KEY;
  const model = process.env.LOCAL_AI_MODEL;

  test.skip(!baseUrl || !apiKey || !model, 'Local AI env variables are required for this test.');

  const response = await request.post(
    `${baseUrl}/chat/completions`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      data: {
        model,
        stream: false,
        messages: [
          {
            role: 'user',
            content: 'Write a simple Playwright test for checking page title.',
          },
        ],
      },
    }
  );

  expect(response.status()).toBe(200);

  const data = await response.json();

  expect(data.choices).toBeTruthy();
  expect(data.choices[0].message.content).toBeTruthy();
});
