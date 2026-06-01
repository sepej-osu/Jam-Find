import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5173';

const user1 = {
  email: process.env.TEST_USER_EMAIL,
  password: process.env.TEST_USER_PASSWORD,
};

const user2 = {
  email: process.env.TEST_USER_EMAIL_1,
  password: process.env.TEST_USER_PASSWORD_1,
};

const requireEnv = (value, name) => {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
};

const login = async (page, { email, password }) => {
  await page.goto(`${APP_URL}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/feed$/);
};

const logout = async (page) => {
  await page.getByTestId('profile-menu-trigger').hover();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
};


test('conversation snapshot refreshes after profile rename', async ({ browser }) => {
  requireEnv(user1.email, 'TEST_USER_EMAIL');
  requireEnv(user1.password, 'TEST_USER_PASSWORD');
  requireEnv(user2.email, 'TEST_USER_EMAIL_1');
  requireEnv(user2.password, 'TEST_USER_PASSWORD_1');

  // ── Capture user 2's profile URL by logging in as them first ────────────────
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await login(page2, user2);
  await page2.locator('[data-scope="avatar"][data-part="root"]').first().click();
  await expect(page2).toHaveURL(/\/profile\//, { timeout: 10000 });
  const user2ProfileUrl = page2.url();
  await ctx2.close();

  // ── User 1: open a conversation with user 2 ─────────────────────────────────
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await login(page1, user1);
  await page1.goto(user2ProfileUrl);
  await page1.getByRole('button', { name: 'Message' }).click();
  await page1.waitForURL(/\/messages\/.+/);
  const conversationId = page1.url().split('/messages/')[1];
  await ctx1.close();

  // ── User 2: rename their profile ────────────────────────────────────────────
  const ctx2b = await browser.newContext();
  const page2b = await ctx2b.newPage();
  await login(page2b, user2);
  const newFirst = `Snapshot${Date.now()}`;
  const newLast = 'Update';
  const newFullName = `${newFirst} ${newLast}`;

  await page2b.goto(`${APP_URL}/update-profile`);
  await page2b.getByLabel('First Name').fill(newFirst);
  await page2b.getByLabel('Last Name').fill(newLast);
  await page2b.getByRole('button', { name: 'Update' }).click();
  await expect(page2b.getByText('Profile updated successfully!')).toBeVisible();
  await ctx2b.close();

  // ── User 1: verify the conversation snapshot shows the new name ──────────────
  const ctx1b = await browser.newContext();
  const page1b = await ctx1b.newPage();
  await login(page1b, user1);
  await page1b.goto(`${APP_URL}/messages/${conversationId}`);
  // Wait for the snapshot sync to complete — the new name should appear in the header
  await expect(page1b.getByText(newFullName)).toBeVisible({ timeout: 10000 });
  await page1b.getByRole('button', { name: 'Back' }).click();
  // Name should also be visible in the conversations list
  await expect(page1b.getByText(newFullName)).toBeVisible({ timeout: 10000 });
  await ctx1b.close();
});

