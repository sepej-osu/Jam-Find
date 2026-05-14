import { test, expect } from '@playwright/test';

//  Note: if this test fails, the burner123@example.com account will need to be manually deleted
//  from the database before the test can be re-run successfully. Seems like a bug, but its to prevent
//  the test from creating too many accounts if it fails before the delete step.


test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('burner123@example.com');
  await page.getByRole('textbox', { name: 'Password *' }).click();
  await page.getByRole('textbox', { name: 'Password *' }).fill('Password123');
  await page.getByRole('textbox', { name: 'Confirm Password' }).click();
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill('Password123');
  await page.getByRole('textbox', { name: 'Birthdate' }).press('Insert');
  await page.getByRole('textbox', { name: 'Birthdate' }).press('End');
  await page.getByRole('textbox', { name: 'Birthdate' }).press('NumLock');
  await page.getByRole('textbox', { name: 'Birthdate' }).fill('1999-01-01');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'First Name' }).click();
  await page.getByRole('textbox', { name: 'First Name' }).fill('John');
  await page.getByRole('textbox', { name: 'Last Name' }).click();
  await page.getByRole('textbox', { name: 'Last Name' }).fill('Doe');
  await page.getByLabel('Gender').selectOption('male');
  await page.getByRole('textbox', { name: 'Zipcode' }).click();
  await page.getByRole('textbox', { name: 'Zipcode' }).fill('91331');
  await page.getByRole('textbox', { name: 'Bio' }).click();
  await page.getByRole('textbox', { name: 'Bio' }).fill('abc');
  await page.getByRole('textbox', { name: 'Bio' }).click();
  await page.getByRole('spinbutton', { name: 'Years of Experience' }).click();
  await page.getByRole('spinbutton', { name: 'Years of Experience' }).fill('2');
  await page.locator('[id="checkbox:_r_k_:control"] svg').click();
  await page.locator('[id="checkbox:_r_v_:control"] > .css-wuqtn7').click();
  await page.getByRole('button', { name: 'Complete' }).click();
  await page.waitForTimeout(500);

  await page.getByTestId('profile-menu-trigger').hover();
  await page.getByRole('menuitem', { name: 'Delete Account' }).click();
  await page.getByRole('button', { name: 'Delete Account' }).click();

  await expect(page.getByText('Account deleted successfully')).toBeVisible();
});