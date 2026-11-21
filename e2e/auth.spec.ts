import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('login page renders authentication methods', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Password')).toBeVisible();
    await expect(page.getByText('API Key')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  });

  test('can switch between password and API key tabs', async ({ page }) => {
    await page.goto('/login');

    // Default is password tab
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();

    // Click API key tab
    await page.getByText('API Key').click();
    await expect(page.getByPlaceholder('Enter your API key')).toBeVisible();

    // Switch back
    await page.getByText('Password').click();
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();
  });
});
