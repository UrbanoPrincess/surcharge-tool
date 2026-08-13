export const MAX_PRICE = 999999.99;
export const MAX_SURCHARGE_PERCENTAGE = 999999.99;
export const MAX_SERVICE_FEE_RATE = 999999.99;

export function roundHalfUp(value: number, decimals = 2): number {
  const stringValue = Math.abs(value).toFixed(decimals + 6);
  const [integerPart, fractionPart = ''] = stringValue.split('.');
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

// Surcharge = original price × (surcharge rate / 100)
export function calculateSurchargeAmount(originalPrice: number, surchargeRate: number): number {
  return roundHalfUp(originalPrice * (surchargeRate / 100));
}

// OO Item Price = Original Price + Surcharge
export function calculateOoItemPrice(originalPrice: number, surchargeAmount: number): number {
  return roundHalfUp(originalPrice + surchargeAmount);
}

// Service Fee = OO Item Price × service fee input (used directly as multiplier)
export function calculateServiceFeeAmount(ooItemPrice: number, serviceFeeInput: number): number {
  return roundHalfUp(ooItemPrice * serviceFeeInput);
}

// Cart Total = OO Item Price + Service Fee
export function calculateCartTotal(ooItemPrice: number, serviceFeeAmount: number): number {
  return roundHalfUp(ooItemPrice + serviceFeeAmount);
}

/**
 * Main Calculation Function
 * @param originalPrice - The DPOS/Base price
 * @param surchargeRate - Surcharge percentage (e.g., 5 for 5%)
 * @param serviceFeeInput - Service fee multiplier (used directly, not converted)
 */
export function calculateTotals(
  originalPrice: number,
  surchargeInput: number,
  serviceFeeInput: number,
) {
  const surchargeAmount = calculateSurchargeAmount(originalPrice, surchargeInput);
  const ooItemPrice = calculateOoItemPrice(originalPrice, surchargeAmount);
  const currentServiceFeeAmount = calculateServiceFeeAmount(ooItemPrice, serviceFeeInput);
  const cartTotal = calculateCartTotal(ooItemPrice, currentServiceFeeAmount);
  const expectedDposServiceFee = roundHalfUp(currentServiceFeeAmount + surchargeAmount);
  const expectedDposTotal = roundHalfUp(originalPrice + expectedDposServiceFee);

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