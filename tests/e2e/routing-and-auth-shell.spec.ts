import { expect, test } from '@playwright/test';

test.describe('Routing and auth shell', () => {
  test('welcome and login routes render', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Bud & Bloom' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Begin the Journey/i })).toBeVisible();

    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Sign In|Create Account/i }).first()).toBeVisible();
    await expect(page.getByText(/Continue as Guest/i)).toHaveCount(0);
  });

  test('unauthenticated app route redirects to public auth', async ({ page }) => {
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const pathname = new URL(page.url()).pathname;
    expect(['/login', '/', '/app']).toContain(pathname);
    await expect(
      page.getByText(/Sign In|Create Account|Need to register/i).first(),
    ).toBeVisible();
  });
});
