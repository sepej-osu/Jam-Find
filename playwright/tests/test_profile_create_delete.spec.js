import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_APP_URL || 'http://localhost:5173';

// A unique email per run avoids any leftover account from a previous failed run.
const uniqueEmail = () => `burner_${Date.now()}@example.com`;

test('user can register, create a profile, and delete their account', async ({ page }) => {
  await page.goto(`${APP_URL}/login`);
  await page.getByRole('link', { name: 'Sign up' }).click();

  // ── Registration step ───────────────────────────────────────────────────────
  await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail());
  await page.getByRole('textbox', { name: 'Password *' }).fill('Password123');
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill('Password123');
  await page.getByRole('textbox', { name: 'Birthdate' }).fill('1999-01-01');
  await page.getByRole('button', { name: 'Next' }).click();

  // ── Profile creation step ───────────────────────────────────────────────────
  await page.getByRole('textbox', { name: 'First Name' }).fill('John');
  await page.getByRole('textbox', { name: 'Last Name' }).fill('Doe');
  await page.getByLabel('Gender').selectOption('male');
  await page.getByRole('textbox', { name: 'Zipcode' }).fill('91331');
  await page.getByRole('textbox', { name: 'Bio' }).fill('abc');
  await page.getByRole('spinbutton', { name: 'Years of Experience' }).fill('2');
  await page.getByRole('button', { name: 'Complete' }).click();
  await page.waitForURL(/\/feed/, { timeout: 15000 });

  // ── Delete account ──────────────────────────────────────────────────────────
  await page.getByTestId('profile-menu-trigger').hover();
  await page.getByRole('menuitem', { name: 'Delete Account' }).click();
  await page.getByRole('button', { name: 'Delete Account' }).click();

  await expect(page.getByText('Account deleted successfully')).toBeVisible();
});