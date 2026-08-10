export function calculateSurcharge(originalPrice: number, surchargeRate: number): number {
  const price = Number(originalPrice);
  const rate = Number(surchargeRate);

  if (!Number.isFinite(price) || !Number.isFinite(rate) || price < 0 || rate < 0) {
    return 0;
  }

  return price * (rate / 100);
}

export function calculateFinalPrice(originalPrice: number, surchargeRate: number): number {
  const price = Number(originalPrice);
  const surcharge = calculateSurcharge(price, surchargeRate);

  if (!Number.isFinite(price) || price < 0) {
    return 0;
  }

  return price + surcharge;
}
