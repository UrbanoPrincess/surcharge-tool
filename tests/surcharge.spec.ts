import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('5% surcharge calculates amount and final price', async ({ page }) => {
  await page.getByLabel('Original Price').fill('23.50');
  await page.getByLabel('Surcharge Rate').fill('5');
  await page.getByRole('button', { name: 'Calculate Surcharge' }).click();

  await expect(page.getByTestId('surcharge-amount')).toHaveText('₱1.18');
  await expect(page.getByTestId('final-price')).toHaveText('₱24.68');
});

test('10% surcharge calculates correct total', async ({ page }) => {
  await page.getByLabel('Original Price').fill('100');
  await page.getByLabel('Surcharge Rate').fill('10');
  await page.getByRole('button', { name: 'Calculate Surcharge' }).click();

  await expect(page.getByTestId('surcharge-amount')).toHaveText('₱10.00');
  await expect(page.getByTestId('final-price')).toHaveText('₱110.00');
});

test('0% surcharge returns zero surcharge', async ({ page }) => {
  await page.getByLabel('Original Price').fill('50');
  await page.getByLabel('Surcharge Rate').fill('0');
  await page.getByRole('button', { name: 'Calculate Surcharge' }).click();

  await expect(page.getByTestId('surcharge-amount')).toHaveText('₱0.00');
  await expect(page.getByTestId('final-price')).toHaveText('₱50.00');
});

test('decimal price calculates correct surcharge', async ({ page }) => {
  await page.getByLabel('Original Price').fill('12.75');
  await page.getByLabel('Surcharge Rate').fill('5');
  await page.getByRole('button', { name: 'Calculate Surcharge' }).click();

  await expect(page.getByTestId('surcharge-amount')).toHaveText('₱0.64');
  await expect(page.getByTestId('final-price')).toHaveText('₱13.39');
});

test('invalid input shows validation message', async ({ page }) => {
  await page.getByLabel('Original Price').fill('');
  await page.getByLabel('Surcharge Rate').fill('5');
  await page.getByRole('button', { name: 'Calculate Surcharge' }).click();

  await expect(page.getByTestId('error-message')).toHaveText('Original price must be a non-negative number.');
  await expect(page.getByTestId('surcharge-amount')).toHaveText('—');
  await expect(page.getByTestId('final-price')).toHaveText('—');
});

test('negative values are rejected', async ({ page }) => {
  await page.getByLabel('Original Price').fill('-10');
  await page.getByLabel('Surcharge Rate').fill('5');
  await page.getByRole('button', { name: 'Calculate Surcharge' }).click();

  await expect(page.getByTestId('error-message')).toHaveText('Original price must be a non-negative number.');
});
