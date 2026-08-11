import { describe, expect, it } from 'vitest';
import { calculateTotals, roundHalfUp } from './calculations';

describe('calculateTotals rate conversions', () => {
  it('matches mandatory test case: 5.00, surcharge 0.5, service fee 0.5', () => {
    const result = calculateTotals(5.0, 0.5, 0.5);

    expect(result.surchargeAmount).toBe(0.25);
    expect(result.ooItemPrice).toBe(5.25);
    expect(result.currentServiceFeeAmount).toBe(2.63);
    expect(result.cartTotal).toBe(7.88);
    expect(result.expectedDposServiceFee).toBe(2.88);
    expect(result.expectedDposTotal).toBe(7.88);
    expect(result.cartTotal).toBe(result.expectedDposTotal);
  });

  it('applies surcharge as input × 0.1', () => {
    const result = calculateTotals(5.0, 0.5, 0);

    expect(result.surchargeAmount).toBe(0.25);
    expect(result.ooItemPrice).toBe(5.25);
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

    expect(result.surchargeAmount).toBe(1.35);
    expect(result.ooItemPrice).toBe(14.85);
    expect(result.currentServiceFeeAmount).toBe(0.15);
    expect(result.cartTotal).toBe(15.0);
    expect(result.expectedDposTotal).toBe(15.0);
  });
});

describe('roundHalfUp', () => {
  it('rounds half up at two decimal places', () => {
    expect(roundHalfUp(0.025)).toBe(0.03);
    expect(roundHalfUp(2.625)).toBe(2.63);
  });
});

describe('OO Cart Total always equals Expected DPOS Total', () => {
  const cases = [
    { originalPrice: 5.0, surchargeInput: 0.5, serviceFeeInput: 0.5 },
    { originalPrice: 5.0, surchargeInput: 0.5, serviceFeeInput: 0.8 },
    { originalPrice: 13.51, surchargeInput: 10, serviceFeeInput: 0.1 },
    { originalPrice: 15, surchargeInput: 5, serviceFeeInput: 0.1 },
    { originalPrice: 20, surchargeInput: 10, serviceFeeInput: 0.05 },
    { originalPrice: 13.5, surchargeInput: 1, serviceFeeInput: 0.01 },
    { originalPrice: 99.99, surchargeInput: 0.8, serviceFeeInput: 0.0125 },
    { originalPrice: 1234.56, surchargeInput: 0, serviceFeeInput: 0 },
  ];

  it.each(cases)(
    'cartTotal === expectedDposTotal for price $originalPrice, surcharge $surchargeInput, fee $serviceFeeInput',
    ({ originalPrice, surchargeInput, serviceFeeInput }) => {
      const result = calculateTotals(originalPrice, surchargeInput, serviceFeeInput);
      expect(result.cartTotal).toBe(result.expectedDposTotal);
    },
  );
});
