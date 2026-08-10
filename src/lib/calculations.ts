export const MAX_PRICE = 999999.99;
export const MAX_SURCHARGE_PERCENTAGE = 999999.99;
export const MAX_SERVICE_FEE_RATE = 999999.99;

export function roundHalfUp(value: number, decimals = 2): number {
  const stringValue = Math.abs(value).toFixed(decimals + 6);
  const [integerPart, fractionPart = ''] = stringValue.split('.');
  const factor = 10 ** decimals;
  const paddedFraction = fractionPart.padEnd(decimals + 1, '0');
  const mainDigits = paddedFraction.slice(0, decimals);
  const roundDigit = Number(paddedFraction[decimals] || '0');

  let roundedMain = BigInt(integerPart + mainDigits);
  if (roundDigit >= 5) {
    roundedMain += 1n;
  }

  const roundedString = roundedMain.toString().padStart(integerPart.length + decimals, '0');
  const whole = roundedString.slice(0, roundedString.length - decimals) || '0';
  const fraction = roundedString.slice(-decimals);
  const result = Number(`${whole}.${fraction}`);

  return value < 0 ? -result : result;
}

export function calculateSurchargeAmount(originalPrice: number, surchargeRate: number): number {
  return originalPrice * (surchargeRate / 100);
}

export function calculateCurrentServiceFeeAmount(
  ooItemPrice: number,
  currentServiceFeeRate: number,
): number {
  return ooItemPrice * currentServiceFeeRate;
}

export function calculateOoItemPrice(originalPrice: number, surchargeAmount: number): number {
  return originalPrice + surchargeAmount;
}

export function calculateCartTotal(ooItemPrice: number, currentServiceFeeAmount: number): number {
  return ooItemPrice + currentServiceFeeAmount;
}

export function calculateExpectedDposServiceFee(
  currentServiceFeeAmount: number,
  surchargeAmount: number,
): number {
  return currentServiceFeeAmount + surchargeAmount;
}

export function calculateExpectedDposTotal(originalPrice: number, expectedDposServiceFee: number): number {
  return originalPrice + expectedDposServiceFee;
}

export function calculateTotals(
  originalPrice: number,
  surchargeRate: number,
  currentServiceFeeRate: number,
) {
  const surchargeAmount = calculateSurchargeAmount(originalPrice, surchargeRate);
  const ooItemPriceRaw = calculateOoItemPrice(originalPrice, surchargeAmount);
  const ooItemPrice = roundHalfUp(ooItemPriceRaw);
  const currentServiceFeeAmountRaw = calculateCurrentServiceFeeAmount(
    ooItemPrice,
    currentServiceFeeRate,
  );
  const currentServiceFeeAmount = roundHalfUp(currentServiceFeeAmountRaw);
  const cartTotal = roundHalfUp(ooItemPrice + currentServiceFeeAmount);
  const expectedDposServiceFeeRaw = currentServiceFeeAmount + surchargeAmount;
  const expectedDposServiceFee = roundHalfUp(expectedDposServiceFeeRaw);
  const expectedDposTotal = roundHalfUp(originalPrice + expectedDposServiceFeeRaw);

  return {
    surchargeAmount,
    currentServiceFeeAmount,
    ooItemPrice,
    cartTotal,
    expectedDposServiceFee,
    expectedDposTotal,
  };
}

export function formatTwoDecimals(value: number): string {
  return roundHalfUp(value).toFixed(2);
}
