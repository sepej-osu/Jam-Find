import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {

  const email = process.env.TEST_USER_EMAIL_1 || process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD_1 || process.env.TEST_USER_PASSWORD;

  await page.goto('http://localhost:5173/login');


    //Login
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  //go to profile page
  await page.getByTestId('profile-menu-trigger').getByText('JD').click();

  //verify profile page content
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole('main')).toContainText('Bio:');
  await expect(page.getByRole('main')).toContainText('Instruments Played:');
  await expect(page.getByRole('main')).toContainText('Genres Played:');
  await expect(page.getByRole('main')).toContainText('Music Samples:');
  await expect(page.getByRole('main')).toContainText('Reviews:');
});