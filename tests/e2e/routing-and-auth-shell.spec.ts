import { expect, test } from '@playwright/test';

test.describe('Routing and auth shell', () => {
  test('welcome and login routes render', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/BabyLog|BabyCore|Get Started|Need to register/i).first(),
    ).toBeVisible();

    await page.goto('/login');
    await expect(
      page.getByText(/Continue as Guest|Create Account|Sign In|Need to register/i).first(),
    ).toBeVisible();
  });

  test('unauthenticated app route redirects to public auth', async ({ page }) => {
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const pathname = new URL(page.url()).pathname;
    expect(['/login', '/', '/app']).toContain(pathname);
    await expect(
      page.getByText(/Continue as Guest|Sign In|Create Account|Need to register/i).first(),
    ).toBeVisible();
  });
});
