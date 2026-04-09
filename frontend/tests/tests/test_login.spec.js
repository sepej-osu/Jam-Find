import { test, expect } from '@playwright/test';

test('test login and logout', async ({ page }) => {
  // Navigate to the login page
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('', { exact: true }).click();
  await page.getByLabel('', { exact: true }).fill('admin@example.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Password123');
  await page.getByRole('button', { name: 'Login' }).click();
  // Expect navigation to contain Discover, Messages, and Create Post
  await expect(page.getByRole('navigation')).toContainText('Discover');
  await expect(page.getByRole('navigation')).toContainText('Messages');
  await expect(page.getByRole('navigation')).toContainText('Create Post');
  // Expect the page to contain the user's name, Pedro Pascal
  await expect(page.locator('#root')).toContainText('Pedro Pascal');

  // Open profile menu (it is hidden until hover on avatar area)
  await page.locator('div').filter({ hasText: /^PP$/ }).first().hover();
  await page.getByRole('menuitem', { name: 'Logout' }).click();

  // After logout, app should return to login
  await expect(page).toHaveURL(/\/login$/);

});