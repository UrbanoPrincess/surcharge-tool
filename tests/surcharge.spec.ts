import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('5% surcharge on 24.00 yields OO item price 25.20', async ({ page }) => {
  await page.getByLabel('Original Price').fill('24.00');
  await page.getByLabel('Surcharge').fill('5');
  await page.getByLabel('Current Service Fee').fill('0');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('1.20');
  await expect(page.getByTestId('oo-item-price')).toHaveText('25.20');
  await expect(page.getByTestId('cart-total')).toHaveText('25.20');
  await expect(page.getByTestId('dpos-total')).toHaveText('25.20');
});

test('0.5% surcharge on 25.00 yields OO item price 25.13', async ({ page }) => {
  await page.getByLabel('Original Price').fill('25.00');
  await page.getByLabel('Surcharge').fill('0.5');
  await page.getByLabel('Current Service Fee').fill('0');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.13');
  await expect(page.getByTestId('oo-item-price')).toHaveText('25.13');
  await expect(page.getByTestId('cart-total')).toHaveText('25.13');
  await expect(page.getByTestId('dpos-total')).toHaveText('25.13');
});

test('surcharge 0.5% and service fee 0.5 on 5.00', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Surcharge').fill('0.5');
  await page.getByLabel('Current Service Fee').fill('0.5');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.03');
  await expect(page.getByTestId('oo-item-price')).toHaveText('5.03');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('2.52');
  await expect(page.getByTestId('cart-total')).toHaveText('7.55');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.55');
  await expect(page.getByTestId('dpos-total')).toHaveText('7.55');
});

test('surcharge 0.5% and service fee 0.8 on 5.00', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Surcharge').fill('0.5');
  await page.getByLabel('Current Service Fee').fill('0.8');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.03');
  await expect(page.getByTestId('oo-item-price')).toHaveText('5.03');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('4.02');
  await expect(page.getByTestId('cart-total')).toHaveText('9.05');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('4.05');
  await expect(page.getByTestId('dpos-total')).toHaveText('9.05');
});

test('full QA flow calculates all fields and totals match', async ({ page }) => {
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
  await expect(page.getByTestId('cart-service-fee')).toHaveText('148.60');
  await expect(page.getByTestId('cart-total')).toHaveText('163.46');

  await expect(page.getByTestId('dpos-original-price')).toHaveText('13.51');
  await expect(page.getByTestId('dpos-transfer-fee')).toHaveText('1.35');
  await expect(page.getByTestId('dpos-current-fee')).toHaveText('148.60');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('149.95');
  await expect(page.getByTestId('dpos-total')).toHaveText('163.46');
});

test('second example calculates correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('15');
  await page.getByLabel('Surcharge').fill('5');
  await page.getByLabel('Current Service Fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.75');
  await expect(page.getByTestId('oo-item-price')).toHaveText('15.75');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('157.50');
  await expect(page.getByTestId('cart-total')).toHaveText('173.25');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('158.25');
  await expect(page.getByTestId('dpos-total')).toHaveText('173.25');
});

test('third example calculates correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('20');
  await page.getByLabel('Surcharge').fill('10');
  await page.getByLabel('Current Service Fee').fill('5');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('2.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('22.00');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('110.00');
  await expect(page.getByTestId('cart-total')).toHaveText('132.00');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('112.00');
  await expect(page.getByTestId('dpos-total')).toHaveText('132.00');
});

test('round half up handles 13.50 surcharge and service fee correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('13.50');
  await page.getByLabel('Surcharge').fill('1');
  await page.getByLabel('Current Service Fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.14');
  await expect(page.getByTestId('oo-item-price')).toHaveText('13.64');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('13.64');
  await expect(page.getByTestId('cart-total')).toHaveText('27.28');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('13.78');
  await expect(page.getByTestId('dpos-total')).toHaveText('27.28');
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

test('backspace after decimal preserves the decimal point', async ({ page }) => {
  const input = page.getByLabel('Original Price');
  await input.fill('65.5');
  await input.press('Backspace');

  await expect(input).toHaveValue('65.');
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

test('calculate without current service fee treats fee as zero', async ({ page }) => {
  await page.getByLabel('Original Price').fill('24.00');
  await page.getByLabel('Surcharge').fill('5');
  await page.getByLabel('Current Service Fee').fill('');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('form-error')).toHaveCount(0);
  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('1.20');
  await expect(page.getByTestId('oo-item-price')).toHaveText('25.20');
  await expect(page.getByTestId('cart-service-fee-rate')).toHaveText('—');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('0.00');
  await expect(page.getByTestId('cart-total')).toHaveText('25.20');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('1.20');
  await expect(page.getByTestId('dpos-total')).toHaveText('25.20');
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

test('minus sign is stripped from input during entry', async ({ page }) => {
  await page.getByLabel('Original Price').fill('-10');
  await page.getByLabel('Surcharge').fill('1');
  await page.getByLabel('Current Service Fee').fill('0.1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByLabel('Original Price')).toHaveValue('10');
  await expect(page.getByTestId('oo-item-price')).toHaveText('10.10');
  await expect(page.getByTestId('cart-total')).toHaveText('11.11');
});
