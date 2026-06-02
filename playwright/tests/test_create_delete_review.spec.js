import { test, expect } from '@playwright/test';

// User 2 logs in first to capture their profile URL.
// User 1 then logs in, navigates to User 2's profile, leaves a review, then deletes it.

test('user 1 leaves a review on user 2 profile, then deletes it', async ({ browser }) => {
  const email1 = process.env.TEST_USER_EMAIL;
  const password1 = process.env.TEST_USER_PASSWORD;
  const email2 = process.env.TEST_USER_EMAIL_1;
  const password2 = process.env.TEST_USER_PASSWORD_1;

  // ── User 2: log in and capture their profile URL ────────────────────────────
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();

  await page2.goto('http://localhost:5173/login');
  await page2.locator('input[name="email"]').fill(email2);
  await page2.locator('input[name="password"]').fill(password2);
  await page2.getByRole('button', { name: 'Login' }).click();
  await page2.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });

  // If user 2 has no profile yet, fill the create-profile form
  if (page2.url().includes('create-profile')) {
    await page2.locator('input[name="firstName"]').fill('Test');
    await page2.locator('input[name="lastName"]').fill('UserTwo');
    await page2.locator('input[name="birthDate"]').fill('1990-01-01');
    await page2.locator('select[name="gender"]').selectOption('male');
    await page2.locator('input[name="zipCode"]').fill('90210');
    await page2.getByRole('button', { name: /create profile/i }).click();
    await page2.waitForURL(/\/feed/, { timeout: 15000 });
  }

  await expect(page2.getByRole('navigation')).toContainText('Discover');

  // Click avatar image directly — its onClick navigates to /profile/:uid (stopPropagation prevents menu open)
  await page2.locator('[data-scope="avatar"][data-part="root"]').first().click();
  await expect(page2).toHaveURL(/\/profile\//, { timeout: 10000 });
  const user2ProfileUrl = page2.url();

  // ── User 1: log in and navigate to User 2's profile ────────────────────────
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();

  await page1.goto('http://localhost:5173/login');
  await page1.locator('input[name="email"]').fill(email1);
  await page1.locator('input[name="password"]').fill(password1);
  await page1.getByRole('button', { name: 'Login' }).click();
  await page1.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  await expect(page1.getByRole('navigation')).toContainText('Discover');

  await page1.goto(user2ProfileUrl);
  await expect(page1).toHaveURL(/\/profile\//, { timeout: 10000 });

  // ── User 1: leave a 4-star review ──────────────────────────────────────────
  // Wait for the review section to finish loading (either form or existing review appears)
  const deleteBtn = page1.getByRole('button', { name: 'Delete' });
  const leaveReviewText = page1.getByText('Leave a review');
  await expect(deleteBtn.or(leaveReviewText)).toBeVisible({ timeout: 10000 });

  // Clean up any existing review from a prior run
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click();
    await expect(leaveReviewText).toBeVisible({ timeout: 10000 });
  }

  await expect(leaveReviewText).toBeVisible({ timeout: 5000 });

  await page1.getByRole('button', { name: 'Rate 4 stars' }).click();
  await page1.getByPlaceholder(/Share your experience/).fill('Great musician, highly recommend!');
  await page1.getByRole('button', { name: 'Submit Review' }).click();

  // After submission the form is replaced by "Your review"
  await expect(page1.getByText('Your review')).toBeVisible({ timeout: 10000 });
  await expect(page1.getByText('Great musician, highly recommend!').first()).toBeVisible();

  // ── User 1: delete the review ───────────────────────────────────────────────
  await page1.getByRole('button', { name: 'Delete' }).click();

  // After deletion the "Leave a review" form should reappear
  await expect(page1.getByText('Leave a review')).toBeVisible({ timeout: 10000 });

  await context1.close();
  await context2.close();
});
