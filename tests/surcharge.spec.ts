import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Example 1: 0.5% surcharge and 0.8% service fee', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Surcharge').fill('0.5');
  await page.getByLabel('Current Service Fee').fill('0.8');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.03');
  await expect(page.getByTestId('oo-item-price')).toHaveText('5.03');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('0.04');
  await expect(page.getByTestId('cart-total')).toHaveText('5.07');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('0.07');
  await expect(page.getByTestId('dpos-total')).toHaveText('5.07');
});

test('Example 2: 5% surcharge and 50% service fee', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Surcharge').fill('5');
  await page.getByLabel('Current Service Fee').fill('50');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.25');
  await expect(page.getByTestId('oo-item-price')).toHaveText('5.25');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('2.63');
  await expect(page.getByTestId('cart-total')).toHaveText('7.88');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.88');
  await expect(page.getByTestId('dpos-total')).toHaveText('7.88');
});

test('percentage-based surcharge QA flow calculates all fields and totals match', async ({ page }) => {
  await page.getByLabel('Original Price').fill('13.51');
  await page.getByLabel('Surcharge').fill('10');
  await page.getByLabel('Current Service Fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-original-price')).toHaveText('13.51');
  await expect(page.getByTestId('oo-surcharge')).toHaveText('10.00%');
  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('1.35');
  await expect(page.getByTestId('oo-item-price')).toHaveText('14.86');

  await expect(page.getByTestId('cart-item-price')).toHaveText('14.86');
  await expect(page.getByTestId('cart-service-fee-rate')).toHaveText('10.00%');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('1.49');
  await expect(page.getByTestId('cart-total')).toHaveText('16.35');

  await expect(page.getByTestId('dpos-original-price')).toHaveText('13.51');
  await expect(page.getByTestId('dpos-transfer-fee')).toHaveText('1.35');
  await expect(page.getByTestId('dpos-current-fee')).toHaveText('1.49');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.84');
  await expect(page.getByTestId('dpos-total')).toHaveText('16.35');
});

test('second percentage example calculates correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('15');
  await page.getByLabel('Surcharge').fill('5');
  await page.getByLabel('Current Service Fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.75');
  await expect(page.getByTestId('oo-item-price')).toHaveText('15.75');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('1.58');
  await expect(page.getByTestId('cart-total')).toHaveText('17.33');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.33');
  await expect(page.getByTestId('dpos-total')).toHaveText('17.33');
});

test('third percentage example calculates correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('20');
  await page.getByLabel('Surcharge').fill('10');
  await page.getByLabel('Current Service Fee').fill('5');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('2.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('22.00');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('1.10');
  await expect(page.getByTestId('cart-total')).toHaveText('23.10');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('3.10');
  await expect(page.getByTestId('dpos-total')).toHaveText('23.10');
});

test('round half up handles 13.50 surcharge and service fee correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('13.50');
  await page.getByLabel('Surcharge').fill('1');
  await page.getByLabel('Current Service Fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.14');
  await expect(page.getByTestId('oo-item-price')).toHaveText('13.64');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('0.14');
  await expect(page.getByTestId('cart-total')).toHaveText('13.78');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('0.28');
  await expect(page.getByTestId('dpos-total')).toHaveText('13.78');
});

test('zero rates leave price unchanged aside from rounding', async ({ page }) => {
  await page.getByLabel('Original Price').fill('12.34');
  await page.getByLabel('Surcharge').fill('0');
  await page.getByLabel('Current Service Fee').fill('0');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('12.34');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('0.00');
  await expect(page.getByTestId('cart-total')).toHaveText('12.34');
  await expect(page.getByTestId('dpos-total')).toHaveText('12.34');
});

test('reset button clears inputs and results', async ({ page }) => {
  await page.getByLabel('Original Price').fill('20');
  await page.getByLabel('Surcharge').fill('2');
  await page.getByLabel('Current Service Fee').fill('3');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(page.getByLabel('Original Price')).toHaveValue('');
  await expect(page.getByLabel('Surcharge')).toHaveValue('');
  await expect(page.getByLabel('Current Service Fee')).toHaveValue('');
  await expect(page.getByTestId('oo-item-price')).toHaveText('—');
  await expect(page.getByTestId('cart-total')).toHaveText('—');
});

test('invalid input shows validation message and blocks calculation', async ({ page }) => {
  await page.getByLabel('Original Price').fill('');
  await page.getByLabel('Surcharge').fill('1');
  await page.getByLabel('Current Service Fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('form-error')).toHaveText('Please fix the highlighted values before calculating.');
  await expect(page.getByTestId('oo-item-price')).toHaveText('—');
  await expect(page.getByTestId('cart-total')).toHaveText('—');
});

test('negative values are rejected by validation', async ({ page }) => {
  await page.getByLabel('Original Price').fill('-10');
  await page.getByLabel('Surcharge').fill('1');
  await page.getByLabel('Current Service Fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('form-error')).toHaveText('Please fix the highlighted values before calculating.');
});
