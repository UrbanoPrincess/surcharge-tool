import { describe, expect, it } from 'vitest';
import { calculateSurchargeAmount, calculateTotals, roundHalfUp } from './calculations';

describe('calculateSurchargeAmount', () => {
  it('converts surcharge rate from percentage to decimal', () => {
    expect(calculateSurchargeAmount(24, 5)).toBe(1.2);
    expect(calculateSurchargeAmount(25, 0.5)).toBe(0.13);
  });

  it('derives expected OO item price from original price and surcharge', () => {
    const result = calculateTotals(24, 5, 0);
    expect(result.surchargeAmount).toBe(1.2);
    expect(result.ooItemPrice).toBe(25.2);

    const roundedResult = calculateTotals(25, 0.5, 0);
    expect(roundedResult.surchargeAmount).toBe(0.13);
    expect(roundedResult.ooItemPrice).toBe(25.13);
  });
});

describe('calculateTotals rate conversions', () => {
  it('calculates surcharge and service fee with different conversions', () => {
    const result = calculateTotals(5.0, 0.5, 0.5);

    expect(result.surchargeAmount).toBe(0.03);
    expect(result.ooItemPrice).toBe(5.03);
    expect(result.currentServiceFeeAmount).toBe(2.52);
    expect(result.cartTotal).toBe(7.55);
    expect(result.expectedDposServiceFee).toBe(2.55);
    expect(result.expectedDposTotal).toBe(7.55);
    expect(result.cartTotal).toBe(result.expectedDposTotal);
  });

  it('uses service fee input directly as multiplier on oo item price', () => {
    const result = calculateTotals(5.0, 0, 0.5);

    expect(result.ooItemPrice).toBe(5.0);
    expect(result.currentServiceFeeAmount).toBe(2.5);
  });

  it('handles zero surcharge and service fee inputs', () => {
    const result = calculateTotals(12.34, 0, 0);

    expect(result.surchargeAmount).toBe(0.0);
    expect(result.ooItemPrice).toBe(12.34);
    expect(result.currentServiceFeeAmount).toBe(0.0);
    expect(result.cartTotal).toBe(12.34);
    expect(result.expectedDposTotal).toBe(12.34);
  });

  it('handles decimal prices with rounding to 2 decimal places', () => {
    const result = calculateTotals(13.5, 1, 0.01);

    expect(result.surchargeAmount).toBe(0.14);
    expect(result.ooItemPrice).toBe(13.64);
    expect(result.currentServiceFeeAmount).toBe(0.14);
    expect(result.cartTotal).toBe(13.78);
    expect(result.expectedDposTotal).toBe(13.78);
  });
});

describe('roundHalfUp', () => {
  it('rounds half up at two decimal places', () => {
    expect(roundHalfUp(0.025)).toBe(0.03);
    expect(roundHalfUp(0.125)).toBe(0.13);
    expect(roundHalfUp(2.625)).toBe(2.63);
  });
});

describe('OO Cart Total always equals Expected DPOS Total', () => {
  const cases = [
    { originalPrice: 24, surchargeRate: 5, serviceFeeInput: 0 },
    { originalPrice: 25, surchargeRate: 0.5, serviceFeeInput: 0 },
    { originalPrice: 5.0, surchargeRate: 0.5, serviceFeeInput: 0.5 },
    { originalPrice: 5.0, surchargeRate: 0.5, serviceFeeInput: 0.8 },
    { originalPrice: 13.51, surchargeRate: 10, serviceFeeInput: 10 },
    { originalPrice: 15, surchargeRate: 5, serviceFeeInput: 10 },
    { originalPrice: 20, surchargeRate: 10, serviceFeeInput: 5 },
    { originalPrice: 13.5, surchargeRate: 1, serviceFeeInput: 1 },
    { originalPrice: 1234.56, surchargeRate: 0, serviceFeeInput: 0 },
  ];

  it.each(cases)(
    'cartTotal === expectedDposTotal for price $originalPrice, surcharge $surchargeRate%, fee $serviceFeeInput',
    ({ originalPrice, surchargeRate, serviceFeeInput }) => {
      const result = calculateTotals(originalPrice, surchargeRate, serviceFeeInput);
      expect(result.cartTotal).toBe(result.expectedDposTotal);
    },
  );
});
