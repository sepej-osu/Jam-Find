import { test, expect } from '@playwright/test';

test('test login and logout', async ({ page }) => {
  // Navigate to the login page
  await page.goto('http://localhost:5173/login');


  // Fill in the email and password fields, then click the login button

  const email = process.env.TEST_USER_EMAIL_1 || process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD_1 || process.env.TEST_USER_PASSWORD;

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Expect navigation to contain Discover, Messages, and Create Post
  await expect(page.getByRole('navigation')).toContainText('Discover');
  await expect(page.getByRole('navigation')).toContainText('Messages');
  await expect(page.getByRole('navigation')).toContainText('Create Post');

  // Open profile menu (it is hidden until hover on avatar area)
  // await page.locator('div').filter({ hasText: /^PP$/ }).first().hover();
  await page.locator('[id*="avatar"]').first().hover();
  await page.getByRole('menuitem', { name: 'Logout' }).click();

  // After logout, app should return to login
  await expect(page).toHaveURL(/\/login$/);

});