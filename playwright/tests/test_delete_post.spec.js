import { test, expect } from '@playwright/test';

const TEST_TITLE = `Playwright delete test post ${Date.now()}`;

test('create a post, open it, delete it, and confirm it is gone', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || process.env.TEST_USER_EMAIL_1;
  const password = process.env.TEST_USER_PASSWORD || process.env.TEST_USER_PASSWORD_1;

  // ── Log in ──────────────────────────────────────────────────────────────────
  await page.goto('http://localhost:5173/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  await expect(page.getByRole('navigation')).toContainText('Discover');

  // ── Create a post ───────────────────────────────────────────────────────────
  await page.getByRole('link', { name: 'Create Post' }).click();
  await expect(page).toHaveURL(/\/create-post/);

  await page.locator('select[name="postType"]').selectOption('looking_to_jam');
  await page.locator('input[name="title"]').fill(TEST_TITLE);
  await page.locator('textarea[name="body"]').fill(
    'This is an automated Playwright test post. Please ignore.'
  );
  await page.locator('input[name="zipCode"]').fill('93065');
  await page.getByRole('button', { name: 'Create Post' }).click();

  await expect(page).toHaveURL(/\/feed/, { timeout: 10000 });
  await expect(page.getByText(TEST_TITLE)).toBeVisible({ timeout: 10000 });

  // ── Click the post title to open the detail page ────────────────────────────
  await page.getByText(TEST_TITLE).click();
  await expect(page).toHaveURL(/\/posts\//, { timeout: 10000 });

  // Capture the post URL so we can verify it is gone after deletion
  const postUrl = page.url();

  // ── Delete the post ─────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Delete Post' }).click();

  // Confirm the deletion in the dialog
  await page.getByRole('button', { name: 'Delete' }).click();

  // After deletion the app navigates back to /feed
  await expect(page).toHaveURL(/\/feed/, { timeout: 10000 });

  // ── Verify the post is gone ─────────────────────────────────────────────────
  // The title should no longer appear in the feed
  await expect(page.getByText(TEST_TITLE)).not.toBeVisible({ timeout: 5000 });

  // Navigating directly to the old URL should not show the post
  await page.goto(postUrl);
  await expect(page.getByText(TEST_TITLE)).not.toBeVisible({ timeout: 5000 });
});
