import { expect, test } from '@playwright/test';
import { primeAuthenticatedApp, stubAuthenticatedAppNetwork, TEST_BABY } from './support/app-shell';

test.describe('Seeded app shell smoke', () => {
  test.beforeEach(async ({ page }) => {
    await stubAuthenticatedAppNetwork(page);
    await primeAuthenticatedApp(page);
  });

  test('family sharing route renders invite and member shells', async ({ page }) => {
    await page.goto('/family-sharing', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Invite Member/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Family Members/i })).toBeVisible();
  });

  test('caregiver handoff route renders the handoff workspace', async ({ page }) => {
    await page.goto('/handoff', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: `Handoff for ${TEST_BABY.name}` })).toBeVisible();
    await page.getByRole('button', { name: /Access/i }).first().click();
    await expect(page.getByRole('button', { name: /Start Handoff/i })).toBeVisible();
  });

  test('sync center shows signed-in diagnostics', async ({ page }) => {
    await page.goto('/sync-center', { waitUntil: 'networkidle' });
    await expect(page.getByText('Sync Center')).toBeVisible();
    await expect(page.getByText('Sync Health')).toBeVisible();
    await expect(page.getByText(/playwright@example.com/i)).toBeVisible();
  });

  test('admin shell route renders the admin console frame', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await expect(page.getByText('Cradlyn Admin')).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Overview$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Full Platform Overview/i })).toBeVisible();
  });

  test('manager shell route renders the manager workspace frame', async ({ page }) => {
    await page.goto('/manager', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Manager Workspace/i })).toBeVisible();
  });
});
