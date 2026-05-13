import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5173';

const user1 = {
  email: process.env.TEST_USER_EMAIL_1,
  password: process.env.TEST_USER_PASSWORD_1,
};

const user2 = {
  email: process.env.TEST_USER_EMAIL_2,
  password: process.env.TEST_USER_PASSWORD_2,
  id: process.env.TEST_USER_ID_2,
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
    await page.goto(`${APP_URL}/profile/${user2.id}`);
    await page.getByRole('button', { name: 'Message' }).click();
    await page.waitForURL(/\/messages\/.+/);
    const conversationId = page.url().split('/messages/')[1];
    return { conversationId };
};


test('conversation snapshot refreshes after profile rename', async ({ page }) => {
  requireEnv(user1.email, 'TEST_USER_EMAIL_1');
  requireEnv(user1.password, 'TEST_USER_PASSWORD_1');
  requireEnv(user2.email, 'TEST_USER_EMAIL_2');
  requireEnv(user2.password, 'TEST_USER_PASSWORD_2');
  requireEnv(user2.id, 'TEST_USER_ID_2');
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
  await expect(page.getByText('Profile updated successfully!')).toBeVisible();
  console.log('Updated profile name to:', newFullName);
  await logout(page);

  await login(page, user1);
  await page.goto(`${APP_URL}/messages/${conversationId}`);
  await page.waitForTimeout(1000); // wait for the snapshot to refresh in the UI
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText(newFullName)).toBeVisible();

  await logout(page);
  

});

