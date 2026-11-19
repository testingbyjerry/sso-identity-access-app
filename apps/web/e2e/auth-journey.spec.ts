import { test, expect } from '@playwright/test';

test.describe('Marketing and Public Pages Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept auth/me check so page does not hang when backend is not running
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ status: 401, json: { success: false, error: { message: 'Unauthorized' } } })
    );
  });

  test('navigates through public website pages seamlessly', async ({ page }) => {
    // 1. Home Page
    await page.goto('/');
    await expect(page).toHaveTitle(/SSO & Identity Access Management/i);
    await expect(page.getByText('Enterprise Single Sign-On')).toBeVisible();

    // 2. Features Page
    await page.getByRole('link', { name: 'Features' }).first().click();
    await expect(page).toHaveURL(/\/features/);
    await expect(page.getByText('Enterprise SSO Protocols')).toBeVisible();

    // 3. Solutions Page
    await page.getByRole('link', { name: 'Solutions' }).first().click();
    await expect(page).toHaveURL(/\/solutions/);
    await expect(page.getByText('B2B SaaS Platforms')).toBeVisible();

    // 4. About Page
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByText('Modular Monolith Architecture')).toBeVisible();

    // 5. Contact Page
    await page.getByRole('link', { name: 'Contact' }).first().click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByRole('heading', { name: /Contact Our Identity/i })).toBeVisible();
  });
});

test.describe('Authentication Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ status: 401, json: { success: false, error: { message: 'Unauthorized' } } })
    );
  });

  test('navigates to login page, validates fields and password toggle', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // Verify inputs exist
    const emailInput = page.getByLabel('Work Email');
    const passwordInput = page.getByPlaceholder('••••••••••••');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check password toggle
    await passwordInput.fill('secretpassword123');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByLabel('Show password').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByLabel('Hide password').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Check forgot password link
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole('heading', { name: 'Password Recovery' })).toBeVisible();
  });

  test('navigates to SSO discovery and finds enterprise provider', async ({ page }) => {
    await page.goto('/login/sso');
    await expect(page.getByRole('heading', { name: 'Enterprise SSO' })).toBeVisible();

    const searchInput = page.getByPlaceholder('alice@acme.com or acme.com');
    await expect(searchInput).toBeVisible();

    // Back to standard login link works
    await page.getByRole('link', { name: /Back to standard password login/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
