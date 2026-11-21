import { test, expect } from '@playwright/test';

test.describe('API Smoke Tests', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.status).toBeDefined();
  });

  test('license endpoint returns structured response', async ({ request }) => {
    const response = await request.get('/api/v1/license');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.licensed).toBeDefined();
  });

  test('pricing endpoint returns tiers', async ({ request }) => {
    const response = await request.get('/api/v1/pricing');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test('stats endpoint returns structured data', async ({ request }) => {
    const response = await request.get('/api/v1/stats');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeDefined();
  });

  test('search endpoint returns results structure', async ({ request }) => {
    const response = await request.get('/api/v1/search?q=test');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeDefined();
  });

  test('admin config endpoint returns config', async ({ request }) => {
    const response = await request.get('/api/v1/admin/config');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeDefined();
  });

  test('SSO status endpoint returns enabled status', async ({ request }) => {
    const response = await request.get('/api/v1/auth/sso/status');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data).toHaveProperty('enabled');
  });

  test('empty-states dashboard returns structured data', async ({ request }) => {
    const response = await request.get('/api/v1/empty-states/dashboard');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toHaveProperty('title');
    expect(body.data).toHaveProperty('description');
  });

  test('frontend serves HTML', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Zerelio');
  });

  test('404 returns proper error', async ({ request }) => {
    const response = await request.get('/api/v1/nonexistent');
    expect(response.status()).toBe(404);
  });
});
