import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5173';

const user1 = {
  email: process.env.TEST_USER_EMAIL_1,
  password: process.env.TEST_USER_PASSWORD_1,
};

const user2 = {
  email: process.env.TEST_USER_EMAIL_2,
  password: process.env.TEST_USER_PASSWORD_2,
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

const openFirstConversation = async (page) => {
  await page.getByRole('link', { name: 'Messages' }).click();
  await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
  const firstCard = page.locator('[data-testid="conversation-card"]').first();
  await expect(firstCard).toBeVisible();
  const name = (await firstCard.getByTestId('conversation-name').innerText()).trim();
  await firstCard.click();
  await page.waitForURL(/\/messages\/.+/);
  const conversationId = (await firstCard.getAttribute('data-conversation-id'))
    || page.url().split('/messages/')[1];
  return { conversationId, name };
};

test('conversation snapshot refreshes after profile rename', async ({ page }) => {
  requireEnv(user1.email, 'TEST_USER_EMAIL_1');
  requireEnv(user1.password, 'TEST_USER_PASSWORD_1');
  requireEnv(user2.email, 'TEST_USER_EMAIL_2');
  requireEnv(user2.password, 'TEST_USER_PASSWORD_2');

  await login(page, user1);
  const { conversationId } = await openFirstConversation(page);
  await logout(page);

  await login(page, user2);
  const newFirst = `Snapshot${Date.now()}`;
  const newLast = 'Update';
  const newFullName = `${newFirst} ${newLast}`;

  await page.goto(`${APP_URL}/update-profile`);
  await page.getByLabel('First Name').fill(newFirst);
  await page.getByLabel('Last Name').fill(newLast);
  await page.getByRole('button', { name: 'Update' }).click();
  await logout(page);

  await login(page, user1);
  await page.goto(`${APP_URL}/messages/${conversationId}`);
  await page.getByText(newFullName);

  await logout(page);
  

});