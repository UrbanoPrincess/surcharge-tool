# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: surcharge.spec.ts >> negative values are rejected by validation
- Location: tests\surcharge.spec.ts:139:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByTestId('form-error')
Expected: "Please fix the highlighted values before calculating."
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByTestId('form-error')

```

```yaml
- main:
  - heading "Surcharge Calculator" [level=1]
  - paragraph: Validate the Online Ordering, Cart, and DPOS behavior for a single item using percentage-based surcharge and service fee rates.
  - text: Original Price
  - textbox "Original Price":
    - /placeholder: "15.00"
    - text: "10"
  - paragraph: Enter a valid non-negative price with up to 2 decimals.
  - text: Surcharge
  - textbox "Surcharge":
    - /placeholder: "1"
    - text: "1"
  - text: "%"
  - paragraph: "Enter as percentage. Example: 1 = 1%"
  - text: Current Service Fee
  - textbox "Current Service Fee":
    - /placeholder: "0.1"
    - text: "1"
  - paragraph: "Enter as percentage. Example: 0.1 = 0.1%"
  - button "Reset"
  - button "Calculate"
  - heading "Online Ordering" [level=2]
  - text: Original Price 10.00 Surcharge Rate 1.00% Surcharge Amount 0.10 Expected OO Item Price 10.10
  - paragraph: The surcharge is included in the displayed item price.
  - heading "Cart" [level=2]
  - text: Item Price 10.10 Current Service Fee Rate 1.00% Current Service Fee 0.10 Expected Cart Total 10.20
  - heading "DPOS Order Summary" [level=2]
  - text: Original Item Price 10.00 Surcharge Transferred to Service Fee 0.10 Current Service Fee 0.10 Expected DPOS Service Fee 0.20 Expected DPOS Total 10.20
  - paragraph: The original item price is preserved, while the item surcharge is added to the Service Fee.
```

# Test source

```ts
  45  | 
  46  |   await expect(page.getByTestId('cart-item-price')).toHaveText('14.86');
  47  |   await expect(page.getByTestId('cart-service-fee-rate')).toHaveText('10.00%');
  48  |   await expect(page.getByTestId('cart-service-fee')).toHaveText('1.49');
  49  |   await expect(page.getByTestId('cart-total')).toHaveText('16.35');
  50  | 
  51  |   await expect(page.getByTestId('dpos-original-price')).toHaveText('13.51');
  52  |   await expect(page.getByTestId('dpos-transfer-fee')).toHaveText('1.35');
  53  |   await expect(page.getByTestId('dpos-current-fee')).toHaveText('1.49');
  54  |   await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.84');
  55  |   await expect(page.getByTestId('dpos-total')).toHaveText('16.35');
  56  | });
  57  | 
  58  | test('second percentage example calculates correctly', async ({ page }) => {
  59  |   await page.getByLabel('Original Price').fill('15');
  60  |   await page.getByLabel('Surcharge').fill('5');
  61  |   await page.getByLabel('Current Service Fee').fill('10');
  62  |   await page.getByRole('button', { name: 'Calculate' }).click();
  63  | 
  64  |   await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.75');
  65  |   await expect(page.getByTestId('oo-item-price')).toHaveText('15.75');
  66  |   await expect(page.getByTestId('cart-service-fee')).toHaveText('1.58');
  67  |   await expect(page.getByTestId('cart-total')).toHaveText('17.33');
  68  |   await expect(page.getByTestId('dpos-service-fee')).toHaveText('2.33');
  69  |   await expect(page.getByTestId('dpos-total')).toHaveText('17.33');
  70  | });
  71  | 
  72  | test('third percentage example calculates correctly', async ({ page }) => {
  73  |   await page.getByLabel('Original Price').fill('20');
  74  |   await page.getByLabel('Surcharge').fill('10');
  75  |   await page.getByLabel('Current Service Fee').fill('5');
  76  |   await page.getByRole('button', { name: 'Calculate' }).click();
  77  | 
  78  |   await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('2.00');
  79  |   await expect(page.getByTestId('oo-item-price')).toHaveText('22.00');
  80  |   await expect(page.getByTestId('cart-service-fee')).toHaveText('1.10');
  81  |   await expect(page.getByTestId('cart-total')).toHaveText('23.10');
  82  |   await expect(page.getByTestId('dpos-service-fee')).toHaveText('3.10');
  83  |   await expect(page.getByTestId('dpos-total')).toHaveText('23.10');
  84  | });
  85  | 
  86  | test('round half up handles 13.50 surcharge and service fee correctly', async ({ page }) => {
  87  |   await page.getByLabel('Original Price').fill('13.50');
  88  |   await page.getByLabel('Surcharge').fill('1');
  89  |   await page.getByLabel('Current Service Fee').fill('1');
  90  |   await page.getByRole('button', { name: 'Calculate' }).click();
  91  | 
  92  |   await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.14');
  93  |   await expect(page.getByTestId('oo-item-price')).toHaveText('13.64');
  94  |   await expect(page.getByTestId('cart-service-fee')).toHaveText('0.14');
  95  |   await expect(page.getByTestId('cart-total')).toHaveText('13.78');
  96  |   await expect(page.getByTestId('dpos-service-fee')).toHaveText('0.28');
  97  |   await expect(page.getByTestId('dpos-total')).toHaveText('13.78');
  98  | });
  99  | 
  100 | test('zero rates leave price unchanged aside from rounding', async ({ page }) => {
  101 |   await page.getByLabel('Original Price').fill('12.34');
  102 |   await page.getByLabel('Surcharge').fill('0');
  103 |   await page.getByLabel('Current Service Fee').fill('0');
  104 |   await page.getByRole('button', { name: 'Calculate' }).click();
  105 | 
  106 |   await expect(page.getByTestId('oo-surcharge-amount')).toHaveText('0.00');
  107 |   await expect(page.getByTestId('oo-item-price')).toHaveText('12.34');
  108 |   await expect(page.getByTestId('cart-service-fee')).toHaveText('0.00');
  109 |   await expect(page.getByTestId('cart-total')).toHaveText('12.34');
  110 |   await expect(page.getByTestId('dpos-total')).toHaveText('12.34');
  111 | });
  112 | 
  113 | test('reset button clears inputs and results', async ({ page }) => {
  114 |   await page.getByLabel('Original Price').fill('20');
  115 |   await page.getByLabel('Surcharge').fill('2');
  116 |   await page.getByLabel('Current Service Fee').fill('3');
  117 |   await page.getByRole('button', { name: 'Calculate' }).click();
  118 | 
  119 |   await page.getByRole('button', { name: 'Reset' }).click();
  120 | 
  121 |   await expect(page.getByLabel('Original Price')).toHaveValue('');
  122 |   await expect(page.getByLabel('Surcharge')).toHaveValue('');
  123 |   await expect(page.getByLabel('Current Service Fee')).toHaveValue('');
  124 |   await expect(page.getByTestId('oo-item-price')).toHaveText('—');
  125 |   await expect(page.getByTestId('cart-total')).toHaveText('—');
  126 | });
  127 | 
  128 | test('invalid input shows validation message and blocks calculation', async ({ page }) => {
  129 |   await page.getByLabel('Original Price').fill('');
  130 |   await page.getByLabel('Surcharge').fill('1');
  131 |   await page.getByLabel('Current Service Fee').fill('1');
  132 |   await page.getByRole('button', { name: 'Calculate' }).click();
  133 | 
  134 |   await expect(page.getByTestId('form-error')).toHaveText('Please fix the highlighted values before calculating.');
  135 |   await expect(page.getByTestId('oo-item-price')).toHaveText('—');
  136 |   await expect(page.getByTestId('cart-total')).toHaveText('—');
  137 | });
  138 | 
  139 | test('negative values are rejected by validation', async ({ page }) => {
  140 |   await page.getByLabel('Original Price').fill('-10');
  141 |   await page.getByLabel('Surcharge').fill('1');
  142 |   await page.getByLabel('Current Service Fee').fill('1');
  143 |   await page.getByRole('button', { name: 'Calculate' }).click();
  144 | 
> 145 |   await expect(page.getByTestId('form-error')).toHaveText('Please fix the highlighted values before calculating.');
      |                                                ^ Error: expect(locator).toHaveText(expected) failed
  146 | });
  147 | 
```