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
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.13');
  await expect(page.getByTestId('oo-item-price')).toHaveText('25.13');
  await expect(page.getByTestId('cart-total')).toHaveText('25.13');
  await expect(page.getByTestId('dpos-total')).toHaveText('25.13');
});

test('platform fee 0.5 on 5.00 calculates without an embedded item fee', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Embedded Item Fee').fill('0');
  await page.getByLabel('Current Platform Fee').fill('0.5');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('5.00');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('2.50');
  await expect(page.getByTestId('cart-total')).toHaveText('7.50');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.50');
  await expect(page.getByTestId('dpos-total')).toHaveText('7.50');
});

test('platform fee 0.8 on 5.00 calculates without an embedded item fee', async ({ page }) => {
  await page.getByLabel('Original Price').fill('5.00');
  await page.getByLabel('Embedded Item Fee').fill('');
  await page.getByLabel('Current Platform Fee').fill('0.8');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('5.00');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('4.00');
  await expect(page.getByTestId('cart-total')).toHaveText('9.00');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('4.00');
  await expect(page.getByTestId('dpos-total')).toHaveText('9.00');
});

test('full QA flow calculates all fields and totals match', async ({ page }) => {
  await page.getByLabel('Original Price').fill('13.51');
  await page.getByLabel('Embedded Item Fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-original-price')).toHaveText('13.51');
  await expect(page.getByTestId('oo-surcharge')).toHaveText('10.00%');
  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('1.35');
  await expect(page.getByTestId('oo-item-price')).toHaveText('14.86');

  await expect(page.getByTestId('cart-item-price')).toHaveText('14.86');
  await expect(page.getByTestId('cart-service-fee')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('14.86');

  await expect(page.getByTestId('dpos-original-price')).toHaveText('13.51');
  await expect(page.getByTestId('dpos-current-fee')).toHaveCount(0);
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('1.35');
  await expect(page.getByTestId('dpos-total')).toHaveText('14.86');
});

test('second example calculates correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('15');
  await page.getByLabel('Embedded Item Fee').fill('0');
  await page.getByLabel('Current Platform Fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('15.00');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('150.00');
  await expect(page.getByTestId('cart-total')).toHaveText('165.00');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('150.00');
  await expect(page.getByTestId('dpos-total')).toHaveText('165.00');
});

test('third example calculates correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('20');
  await page.getByLabel('Embedded Item Fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('2.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('22.00');
  await expect(page.getByTestId('cart-service-fee')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('22.00');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.00');
  await expect(page.getByTestId('dpos-total')).toHaveText('22.00');
});

test('round half up handles 13.50 embedded item fee and platform fee correctly', async ({ page }) => {
  await page.getByLabel('Original Price').fill('13.50');
  await page.getByLabel('Embedded Item Fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.14');
  await expect(page.getByTestId('oo-item-price')).toHaveText('13.64');
  await expect(page.getByTestId('cart-service-fee')).toHaveCount(0);
  await expect(page.getByTestId('cart-total')).toHaveText('13.64');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('0.14');
  await expect(page.getByTestId('dpos-total')).toHaveText('13.64');
});

test('zero embedded item fee allows a platform fee calculation', async ({ page }) => {
  await page.getByLabel('Original Price').fill('12.34');
  await page.getByLabel('Embedded Item Fee').fill('0');
  await page.getByLabel('Current Platform Fee').fill('0.1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.00');
  await expect(page.getByTestId('oo-item-price')).toHaveText('12.34');
  await expect(page.getByTestId('cart-service-fee')).toHaveText('1.23');
  await expect(page.getByTestId('cart-total')).toHaveText('13.57');
  await expect(page.getByTestId('dpos-service-fee')).toHaveText('1.23');
  await expect(page.getByTestId('dpos-total')).toHaveText('13.57');
});

test('zero platform fee hides current fee rows and includes embedded fee in DPOS platform fee', async ({ page }) => {
  await page.getByLabel('Original Price').fill('12.00');
  await page.getByLabel('Embedded Item Fee').fill('2');
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

test('fee selection requires exactly one configured fee', async ({ page }) => {
  const calculateButton = page.getByRole('button', { name: 'Calculate' });
  const noFeeMessage = page.getByText('Enter either an Embedded Item Fee or a Platform Fee.', { exact: true });
  const embeddedItemFee = page.getByTestId('surcharge');
  const platformFee = page.getByTestId('current-service-fee');

  await expect(calculateButton).toBeDisabled();
  await expect(noFeeMessage).toHaveCount(0);

  await page.getByLabel('Original Price').fill('12.00');
  await expect(calculateButton).toBeDisabled();
  await expect(noFeeMessage).toHaveCount(0);

  await embeddedItemFee.fill('2');
  await expect(calculateButton).toBeEnabled();
  await expect(noFeeMessage).toHaveCount(0);
  await expect(platformFee).toBeDisabled();
  const platformFeeTooltipTrigger = page.getByTestId('platform-fee-disabled-trigger');
  await platformFeeTooltipTrigger.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Clear the Embedded Item Fee to use Platform Fee.');
  await expect(page.getByRole('tooltip')).toHaveCount(1);
  await page.getByRole('tooltip').hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.getByRole('heading', { name: 'Embedded Item Fee Calculator' }).hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await platformFeeTooltipTrigger.focus();
  await expect(page.getByRole('tooltip')).toHaveText('Clear the Embedded Item Fee to use Platform Fee.');
  await platformFeeTooltipTrigger.blur();
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await platformFeeTooltipTrigger.click();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.getByRole('heading', { name: 'Embedded Item Fee Calculator' }).click();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(page.getByTestId('form-error')).toHaveCount(0);
  await expect(noFeeMessage).toHaveCount(0);

  await embeddedItemFee.fill('');
  await expect(platformFee).toBeEnabled();
  await expect(calculateButton).toBeDisabled();

  await platformFee.fill('0.1');
  await expect(calculateButton).toBeEnabled();
  await expect(embeddedItemFee).toBeDisabled();
  await expect(noFeeMessage).toHaveCount(0);
  const embeddedItemFeeTooltipTrigger = page.getByTestId('embedded-item-fee-disabled-trigger');
  await embeddedItemFeeTooltipTrigger.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Clear the Platform Fee to use Embedded Item Fee.');
  await expect(page.getByRole('tooltip')).toHaveCount(1);
  await page.getByRole('heading', { name: 'Embedded Item Fee Calculator' }).hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await embeddedItemFeeTooltipTrigger.click();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.getByRole('heading', { name: 'Embedded Item Fee Calculator' }).click();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(page.getByTestId('form-error')).toHaveCount(0);

  await platformFee.fill('');
  await expect(embeddedItemFee).toBeEnabled();

  await embeddedItemFee.fill('0');
  await platformFee.fill('0.00');
  await expect(calculateButton).toBeDisabled();
  await expect(noFeeMessage).toHaveCount(0);
});

test('minus sign is stripped from input during entry', async ({ page }) => {
  await page.getByLabel('Original Price').fill('-10');
  await page.getByLabel('Embedded Item Fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByLabel('Original Price')).toHaveValue('10');
  await expect(page.getByTestId('oo-item-price')).toHaveText('10.10');
  await expect(page.getByTestId('cart-total')).toHaveText('10.10');
});

test('one Embedded Fee popover adds Shop or Table as separate flows', async ({ page }) => {
  await expect(page.getByTestId('add-shop')).toHaveCount(0);
  await expect(page.getByTestId('add-table')).toHaveCount(0);
  await expect(page.getByTestId('shop-embedded-fee')).toHaveCount(0);
  await expect(page.getByTestId('table-embedded-fee')).toHaveCount(0);

  await page.getByLabel('Original Price').fill('12.00');
  await page.getByLabel('Embedded Item Fee').fill('5');
  await page.getByTestId('add-embedded-fee').click();
  const embeddedFeesPopover = page.getByTestId('embedded-fees-popover');
  await expect(embeddedFeesPopover).toContainText('Embedded Fees');
  await expect(page.getByTestId('shop-embedded-fee')).toBeVisible();
  await expect(page.getByTestId('table-embedded-fee')).toBeVisible();
  const tableLabelY = await embeddedFeesPopover.getByText('Table', { exact: true }).evaluate((element) => element.getBoundingClientRect().y);
  const shopLabelY = await embeddedFeesPopover.getByText('Shop', { exact: true }).evaluate((element) => element.getBoundingClientRect().y);
  expect(tableLabelY).toBeLessThan(shopLabelY);
  await page.getByTestId('shop-embedded-fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  const shopGroup = page.getByRole('region', { name: 'Shop Embedded Fee Results' });
  await expect(shopGroup.getByRole('heading', { name: 'Online Ordering', exact: true })).toHaveCount(1);
  await expect(shopGroup.getByRole('heading', { name: 'Cart', exact: true })).toHaveCount(1);
  await expect(shopGroup.getByRole('heading', { name: 'DPOS Order Summary', exact: true })).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Table Embedded Fee Results' })).toHaveCount(0);
  await expect(page.getByTestId('oo-item-price')).toHaveText('12.60');
  await expect(page.getByTestId('shop-oo-item-price-1')).toHaveText('13.20');
  await expect(page.getByTestId('shop-cart-item-price-1')).toHaveText('13.20');
  await expect(page.getByTestId('shop-cart-embedded-fee')).toHaveCount(0);
  await expect(page.getByTestId('shop-cart-total')).toHaveText('13.20');
  await expect(page.getByTestId('shop-dpos-embedded-fee')).toHaveCount(0);
  await expect(page.getByTestId('shop-dpos-service-fee')).toHaveText('1.20');
  await expect(page.getByTestId('shop-dpos-total')).toHaveText('13.20');

  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByLabel('Original Price').fill('12.00');
  await page.getByLabel('Embedded Item Fee').fill('5');
  await page.getByTestId('add-embedded-fee').click();
  await page.getByTestId('table-embedded-fee').fill('20');
  await page.getByRole('button', { name: 'Calculate' }).click();

  const tableGroup = page.getByRole('region', { name: 'Table Embedded Fee Results' });
  await expect(tableGroup.getByRole('heading', { name: 'Online Ordering', exact: true })).toHaveCount(1);
  await expect(tableGroup.getByRole('heading', { name: 'Cart', exact: true })).toHaveCount(1);
  await expect(tableGroup.getByRole('heading', { name: 'DPOS Order Summary', exact: true })).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Shop Embedded Fee Results' })).toHaveCount(0);
  await expect(page.getByTestId('oo-item-price')).toHaveText('12.60');
  await expect(page.getByTestId('table-oo-item-price-1')).toHaveText('14.40');
  await expect(page.getByTestId('table-cart-item-price-1')).toHaveText('14.40');
  await expect(page.getByTestId('table-cart-embedded-fee')).toHaveCount(0);
  await expect(page.getByTestId('table-cart-total')).toHaveText('14.40');
  await expect(page.getByTestId('table-dpos-embedded-fee')).toHaveCount(0);
  await expect(page.getByTestId('table-dpos-service-fee')).toHaveText('2.40');
  await expect(page.getByTestId('table-dpos-total')).toHaveText('14.40');
});

test('Item, Shop, and Table fee values remain independent through recalculation', async ({ page }) => {
  await page.getByLabel('Original Price').fill('12.00');
  await page.getByLabel('Embedded Item Fee').fill('2');
  await page.getByTestId('add-embedded-fee').click();
  await page.getByTestId('shop-embedded-fee').fill('5');
  await page.getByTestId('table-embedded-fee').fill('10');
  await page.getByRole('button', { name: 'Calculate' }).click();

  const expectFlowPrices = async (itemPrice: string, shopPrice: string, tablePrice: string) => {
    await expect(page.getByTestId('oo-item-price')).toHaveText(itemPrice);
    await expect(page.getByTestId('shop-oo-item-price-1')).toHaveText(shopPrice);
    await expect(page.getByTestId('table-oo-item-price-1')).toHaveText(tablePrice);
  };

  await expectFlowPrices('12.24', '12.60', '13.20');
  await expect(page.getByTestId('item-embedded-fee-rate')).toHaveText('2%');
  await expect(page.getByTestId('shop-embedded-fee-rate')).toHaveText('5%');
  await expect(page.getByTestId('table-embedded-fee-rate')).toHaveText('10%');
  await expect(page.getByRole('region', { name: 'Shop Embedded Fee Results' }).getByRole('heading', { name: 'Online Ordering', exact: true })).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Table Embedded Fee Results' }).getByRole('heading', { name: 'Online Ordering', exact: true })).toHaveCount(1);
  const tableGroupBox = await page.getByRole('region', { name: 'Table Embedded Fee Results' }).boundingBox();
  const shopGroupBox = await page.getByRole('region', { name: 'Shop Embedded Fee Results' }).boundingBox();
  expect(tableGroupBox).not.toBeNull();
  expect(shopGroupBox).not.toBeNull();
  expect(tableGroupBox!.y).toBeLessThan(shopGroupBox!.y);

  await page.getByLabel('Embedded Item Fee').fill('3');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expectFlowPrices('12.36', '12.60', '13.20');
  await expect(page.getByTestId('item-embedded-fee-rate')).toHaveText('3%');
  await expect(page.getByTestId('shop-embedded-fee-rate')).toHaveText('5%');
  await expect(page.getByTestId('table-embedded-fee-rate')).toHaveText('10%');

  await page.getByTestId('add-embedded-fee').click();
  await page.getByTestId('shop-embedded-fee').fill('7');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expectFlowPrices('12.36', '12.84', '13.20');
  await expect(page.getByTestId('item-embedded-fee-rate')).toHaveText('3%');
  await expect(page.getByTestId('shop-embedded-fee-rate')).toHaveText('7%');
  await expect(page.getByTestId('table-embedded-fee-rate')).toHaveText('10%');

  await page.getByTestId('add-embedded-fee').click();
  await page.getByTestId('table-embedded-fee').fill('1');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expectFlowPrices('12.36', '12.84', '12.12');
  await expect(page.getByTestId('item-embedded-fee-rate')).toHaveText('3%');
  await expect(page.getByTestId('shop-embedded-fee-rate')).toHaveText('7%');
  await expect(page.getByTestId('table-embedded-fee-rate')).toHaveText('1%');

  await page.getByTestId('calculation-breakdown-toggle').click();
  const breakdown = page.getByTestId('calculation-breakdown');
  await expect(breakdown).toContainText('Embedded Item Fee');
  await expect(breakdown).toContainText('Shop Embedded Fee');
  await expect(breakdown).toContainText('Table Embedded Fee');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('region', { name: 'Shop Embedded Fee Results' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Table Embedded Fee Results' })).toHaveCount(0);
});
