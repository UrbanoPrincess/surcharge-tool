import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('result sections remain blank before calculation', async ({ page }) => {
  await expect(page.getByTestId('oo-item-price')).toHaveCount(0);
  await expect(page.getByTestId('cart-item-price')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('');
  await expect(page.getByTestId('dpos-original-price')).toHaveCount(0);
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('');
  await expect(page.getByTestId('dpos-total')).toHaveText('');
  await expect(page.getByText('—', { exact: true })).toHaveCount(0);

  const onlineOrdering = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Online Ordering' }),
  });
  const headerBox = await onlineOrdering.getByText('Original', { exact: true }).boundingBox();
  const helperBox = await onlineOrdering.getByText('The embedded item fee is included in the displayed item price.').boundingBox();
  expect(headerBox).not.toBeNull();
  expect(helperBox).not.toBeNull();
  expect(helperBox!.y - (headerBox!.y + headerBox!.height)).toBeGreaterThanOrEqual(48);
});

test('5% embedded item fee on 24.00 yields OO item price 25.20', async ({ page }) => {
  await page.getByLabel('Original Price').fill('24.00');
  await page.getByLabel('Embedded Item Fee').fill('5');
  await page.getByLabel('Current Platform Fee').fill('0');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('1.20');
  await expect(page.getByTestId('oo-item-price')).toHaveText('25.20');
  await expect(page.getByTestId('cart-total')).toHaveText('25.20');
  await expect(page.getByTestId('dpos-total')).toHaveText('25.20');

  const columnPositions = await Promise.all(
    ['oo-original-price', 'oo-item-price', 'oo-surcharge-amount'].map((testId) =>
      page.getByTestId(testId).evaluate((element) => element.getBoundingClientRect().left),
    ),
  );
  expect(columnPositions[0]).toBeLessThan(columnPositions[1]);
  expect(columnPositions[1]).toBeLessThan(columnPositions[2]);
});

test('0.5% embedded item fee on 25.00 yields OO item price 25.13', async ({ page }) => {
  await page.getByLabel('Original Price').fill('25.00');
  await page.getByLabel('Embedded Item Fee').fill('0.5');
  await page.getByLabel('Current Platform Fee').fill('0');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.13');
  await expect(page.getByTestId('oo-item-price')).toHaveText('25.13');
  await expect(page.getByTestId('cart-total')).toHaveText('25.13');
  await expect(page.getByTestId('dpos-total')).toHaveText('25.13');
});

test('embedded item fee 0.5% and platform fee 0.5 on 5.00', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Embedded Item Fee').fill('0.5');
  await page.getByLabel('Current Platform Fee').fill('0.5');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.03');
  await expect(page.getByTestId('oo-item-price')).toHaveText('5.03');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('2.52');
  await expect(page.getByTestId('cart-total')).toHaveText('7.55');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.55');
  await expect(page.getByTestId('dpos-total')).toHaveText('7.55');
});

test('embedded item fee 0.5% and platform fee 0.8 on 5.00', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Embedded Item Fee').fill('0.5');
  await page.getByLabel('Current Platform Fee').fill('0.8');
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
  await page.getByLabel('Embedded Item Fee').fill('10');
  await page.getByLabel('Current Platform Fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-original-price')).toHaveText('13.51');
  await expect(page.getByTestId('oo-surcharge')).toHaveText('10.00%');
  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('1.35');
  await expect(page.getByTestId('oo-item-price')).toHaveText('14.86');

  await expect(page.getByTestId('cart-item-price')).toHaveText('14.86');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('148.60');
  await expect(page.getByTestId('cart-total')).toHaveText('163.46');

  await expect(page.getByTestId('dpos-original-price')).toHaveText('13.51');
  await expect(page.getByTestId('dpos-current-fee')).toHaveText('148.60');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('149.95');
  await expect(page.getByTestId('dpos-total')).toHaveText('163.46');
});

test('second example calculates correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('15');
  await page.getByLabel('Embedded Item Fee').fill('5');
  await page.getByLabel('Current Platform Fee').fill('10');
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
  await page.getByLabel('Embedded Item Fee').fill('10');
  await page.getByLabel('Current Platform Fee').fill('5');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('2.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('22.00');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('110.00');
  await expect(page.getByTestId('cart-total')).toHaveText('132.00');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('112.00');
  await expect(page.getByTestId('dpos-total')).toHaveText('132.00');
});

test('round half up handles 13.50 embedded item fee and platform fee correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('13.50');
  await page.getByLabel('Embedded Item Fee').fill('1');
  await page.getByLabel('Current Platform Fee').fill('1');
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
  await page.getByLabel('Embedded Item Fee').fill('0');
  await page.getByLabel('Current Platform Fee').fill('0');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('12.34');
  await expect(page.getByTestId('cart-service-fee')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('12.34');
  await expect(page.getByTestId('dpos-total')).toHaveText('12.34');
});

test('zero platform fee hides current fee rows and includes embedded fee in DPOS platform fee', async ({ page }) => {
  await page.getByLabel('Original Price').fill('12.00');
  await page.getByLabel('Embedded Item Fee').fill('2');
  await page.getByLabel('Current Platform Fee').fill('0.00');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-item-price')).toHaveText('12.24');
  await expect(page.getByTestId('cart-item-price')).toHaveText('12.24');
  await expect(page.getByTestId('cart-service-fee')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('12.24');
  await expect(page.getByTestId('dpos-original-price')).toHaveText('12.00');
  await expect(page.getByText('Embedded Item Fee Transferred to Platform Fee', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('dpos-current-fee')).toHaveCount(0);
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('0.24');
  await expect(page.getByTestId('dpos-total')).toHaveText('12.24');
  await expect(page.getByText('Platform Fee', { exact: true })).toBeVisible();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();
});

test('backspace after decimal preserves the decimal point', async ({ page }) => {
  const input = page.getByLabel('Original Price');
  await input.fill('65.5');
  await input.press('Backspace');

  await expect(input).toHaveValue('65.');
});

test('reset button clears inputs and results', async ({ page }) => {
  await page.getByLabel('Original Price').fill('20');
  await page.getByLabel('Embedded Item Fee').fill('2');
  await page.getByLabel('Current Platform Fee').fill('3');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(page.getByLabel('Original Price')).toHaveValue('');
  await expect(page.getByLabel('Embedded Item Fee')).toHaveValue('');
  await expect(page.getByLabel('Current Platform Fee')).toHaveValue('');
  await expect(page.getByTestId('oo-item-price')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('');
});

test('calculate without current platform fee treats fee as zero', async ({ page }) => {
  await page.getByLabel('Original Price').fill('24.00');
  await page.getByLabel('Embedded Item Fee').fill('5');
  await page.getByLabel('Current Platform Fee').fill('');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('form-error')).toHaveCount(0);
  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('1.20');
  await expect(page.getByTestId('oo-item-price')).toHaveText('25.20');
  await expect(page.getByTestId('cart-service-fee')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('25.20');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('1.20');
  await expect(page.getByTestId('dpos-total')).toHaveText('25.20');
});

test('calculation breakdown shows steps after calculate', async ({ page }) => {
  await page.getByLabel('Original Price').fill('63.00');
  await page.getByLabel('Embedded Item Fee').fill('5');
  await page.getByLabel('Current Platform Fee').fill('');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('calculation-breakdown')).toHaveCount(0);

  await page.getByTestId('calculation-breakdown-toggle').click();

  const breakdown = page.getByTestId('calculation-breakdown');
  await expect(breakdown).toBeVisible();
  await expect(breakdown).toContainText('63.00 × 0.05 = 3.15');
  await expect(breakdown).toContainText('63.00 + 3.15 = 66.15');
  await expect(breakdown).toContainText('DPOS Calculation');
  await expect(breakdown).toContainText('The original item price is preserved, while the embedded item fee is added to the Platform Fee.');
  await expect(breakdown).toContainText('Total');

  await page.getByTestId('calculation-breakdown-toggle').click();
  await expect(page.getByTestId('calculation-breakdown')).toHaveCount(0);
  await expect(page.getByTestId('calculation-breakdown-toggle')).toContainText('Show Calculation Breakdown');
});

test('result cards adapt to desktop, tablet, and mobile widths', async ({ page }) => {
  const getHeadingPositions = async () => Promise.all(
    ['Online Ordering', 'Cart', 'DPOS Order Summary'].map(async (name) =>
      page.getByRole('heading', { name }).evaluate((heading) => {
        const { x, y, height } = heading.getBoundingClientRect();
        return { x, y, height };
      }),
    ),
  );
  const expectNoHorizontalOverflow = async (width: number) => {
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(width);
  };

  await page.setViewportSize({ width: 1280, height: 900 });
  let [onlineOrdering, cart, dpos] = await getHeadingPositions();
  expect(onlineOrdering.y).toBe(cart.y);
  expect(cart.y).toBe(dpos.y);
  expect(dpos.height).toBeLessThanOrEqual(28);
  await expectNoHorizontalOverflow(1280);

  await page.setViewportSize({ width: 1024, height: 900 });
  [onlineOrdering, cart, dpos] = await getHeadingPositions();
  expect(onlineOrdering.y).toBe(cart.y);
  expect(cart.y).toBe(dpos.y);
  expect(dpos.height).toBeLessThanOrEqual(28);
  await expectNoHorizontalOverflow(1024);

  await page.setViewportSize({ width: 800, height: 900 });
  [onlineOrdering, cart, dpos] = await getHeadingPositions();
  expect(onlineOrdering.y).toBe(cart.y);
  expect(dpos.y).toBeGreaterThan(cart.y);
  await expectNoHorizontalOverflow(800);

  await page.setViewportSize({ width: 390, height: 900 });
  [onlineOrdering, cart, dpos] = await getHeadingPositions();
  expect(cart.y).toBeGreaterThan(onlineOrdering.y);
  expect(dpos.y).toBeGreaterThan(cart.y);

  await expectNoHorizontalOverflow(390);
});

test('invalid input shows validation message and blocks calculation', async ({ page }) => {
  await page.getByLabel('Original Price').fill('');
  await page.getByLabel('Embedded Item Fee').fill('1');
  await page.getByLabel('Current Platform Fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('form-error')).toHaveText('Please fix the highlighted values before calculating.');
  await expect(page.getByTestId('oo-item-price')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('');
});

test('minus sign is stripped from input during entry', async ({ page }) => {
  await page.getByLabel('Original Price').fill('-10');
  await page.getByLabel('Embedded Item Fee').fill('1');
  await page.getByLabel('Current Platform Fee').fill('0.1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByLabel('Original Price')).toHaveValue('10');
  await expect(page.getByTestId('oo-item-price')).toHaveText('10.10');
  await expect(page.getByTestId('cart-total')).toHaveText('11.11');
});
