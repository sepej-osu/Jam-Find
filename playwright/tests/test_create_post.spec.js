import { test, expect } from '@playwright/test';

const TEST_TITLE = `Playwright test post ${Date.now()}`;

test('create a post and verify it appears in the feed', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || process.env.TEST_USER_EMAIL_1;
  const password = process.env.TEST_USER_PASSWORD || process.env.TEST_USER_PASSWORD_1;

  // ── Log in ──────────────────────────────────────────────────────────────────
  await page.goto('http://localhost:5173/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for redirect away from login (confirms successful login)
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });

  // Wait until the nav is visible
  await expect(page.getByRole('navigation')).toContainText('Discover');

  // ── Navigate to Create Post ─────────────────────────────────────────────────
  await page.getByRole('link', { name: 'Create Post' }).click();
  await expect(page).toHaveURL(/\/create-post/);

  // ── Fill out the form ───────────────────────────────────────────────────────

  // Post Type — select "Looking to Jam"
  await page.locator('select[name="postType"]').selectOption('looking_to_jam');

  // Title
  await page.locator('input[name="title"]').fill(TEST_TITLE);

  // Body
  await page.locator('textarea[name="body"]').fill(
    'This is an automated Playwright test post. Please ignore.'
  );

  // Zipcode
  await page.locator('input[name="zipCode"]').fill('93065');

  // ── Submit ──────────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Create Post' }).click();

  // After successful creation, the app navigates to /feed
  await expect(page).toHaveURL(/\/feed/, { timeout: 10000 });

  // ── Verify the post appears in the feed ─────────────────────────────────────
  await expect(page.getByText(TEST_TITLE)).toBeVisible({ timeout: 10000 });
});
