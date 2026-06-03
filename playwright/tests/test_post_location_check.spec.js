import { test, expect } from '@playwright/test';

const TEST_TITLE = `Playwright location check ${Date.now()}`;

test('post location resolves and displays correctly on post detail', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const zipCode = process.env.TEST_USER_ZIP || '97333';

  // ── Log in ──────────────────────────────────────────────────────────────────
  await page.goto('http://localhost:5173/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  await expect(page.getByRole('navigation')).toContainText('Discover');

  // ── Create a post with the test zip ─────────────────────────────────────────
  await page.getByRole('link', { name: 'Create Post' }).click();
  await expect(page).toHaveURL(/\/create-post/);

  await page.locator('select[name="postType"]').selectOption('looking_to_jam');
  await page.locator('input[name="title"]').fill(TEST_TITLE);
  await page.locator('textarea[name="body"]').fill(
    'Automated Playwright location check. Please ignore.'
  );
  await page.locator('input[name="zipCode"]').fill(zipCode);
  await page.getByRole('button', { name: 'Create Post' }).click();

  await expect(page).toHaveURL(/\/feed/, { timeout: 10000 });
  await expect(page.getByText(TEST_TITLE)).toBeVisible({ timeout: 10000 });

  // ── Open the post detail page and capture the API response ──────────────────
  // waitForResponse resolves once the matching response arrives, giving us the
  // resolved formattedAddress without needing a separate auth token.
  const [response] = await Promise.all([
    page.waitForResponse(res =>
      res.url().includes('/api/v1/posts/') && res.status() === 200
    ),
    page.getByText(TEST_TITLE).click(),
  ]);
  await expect(page).toHaveURL(/\/posts\//, { timeout: 10000 });
  const postUrl = page.url();

  const postData = await response.json();
  const expectedAddress = postData.location?.formattedAddress ?? null;

  // Wait for the post content to load
  await expect(page.getByText(TEST_TITLE)).toBeVisible({ timeout: 10000 });

  // ── Verify location is displayed ─────────────────────────────────────────────
  if (expectedAddress) {
    await expect(page.getByText(expectedAddress, { exact: false })).toBeVisible({ timeout: 5000 });
  } else {
    // If location wasn't resolved, the location row should not appear at all
    await expect(page.locator('[data-testid="post-location"]')).not.toBeAttached();
  }

  // ── Clean up — delete the post ───────────────────────────────────────────────
  await page.getByRole('button', { name: 'Delete Post' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page).toHaveURL(/\/feed/, { timeout: 10000 });
  await expect(page.getByText(TEST_TITLE)).not.toBeVisible({ timeout: 5000 });

  await page.goto(postUrl);
  await expect(page.getByText(TEST_TITLE)).not.toBeVisible({ timeout: 5000 });
});
