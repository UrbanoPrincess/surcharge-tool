<script lang="ts">
  import {
    calculateTotals,
    formatTwoDecimals,
    MAX_PRICE,
    MAX_SURCHARGE_PERCENTAGE,
    MAX_SERVICE_FEE_RATE,
  } from '$lib/calculations';

  type FieldKey = 'originalPrice' | 'surchargeRate' | 'currentServiceFeeRate';

  let originalPrice = '';
  let surchargeRate = '';
  let currentServiceFeeRate = '';

  let validationErrors: Record<FieldKey, string> = {
    originalPrice: '',
    surchargeRate: '',
    currentServiceFeeRate: '',
  };

  let formError = '';
  let hasCalculated = false;

  let surchargeAmount: number | null = null;
  let currentServiceFeeAmount: number | null = null;
  let ooItemPrice: number | null = null;
  let cartTotal: number | null = null;
  let expectedDposServiceFee: number | null = null;
  let expectedDposTotal: number | null = null;
  let totalsMatch = false;

  const sanitizeAmountInput = (value: string) => {
    let sanitized = value.replace(/[^0-9.\-]/g, '');

    if (sanitized.startsWith('-')) {
      sanitized = `-${sanitized.slice(1).replace(/-/g, '')}`;
    } else {
      sanitized = sanitized.replace(/-/g, '');
    }

    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    if (sanitized.includes('.')) {
      const [integer, decimal = ''] = sanitized.split('.');
      sanitized = `${integer}.${decimal.slice(0, 2)}`;
    }

    if (sanitized.length > 12) {
      sanitized = sanitized.slice(0, 12);
    }

    return sanitized;
  };

  const handleInput = (field: FieldKey, rawValue: string) => {
    const sanitized = sanitizeAmountInput(rawValue);

    if (field === 'originalPrice') originalPrice = sanitized;
    if (field === 'surchargeRate') surchargeRate = sanitized;
    if (field === 'currentServiceFeeRate') currentServiceFeeRate = sanitized;

    validationErrors[field] = '';
    formError = '';
  };

  const parseAmount = (value: string) => Number(value);

  const isValidDecimal = (value: string, max: number) => {
    const trimmed = value.trim();
    if (trimmed === '') return false;
    if (/[eE+]/.test(trimmed)) return false;
    if (!/^(?:\d+|\d+\.\d{1,2}|\.\d{1,2})$/.test(trimmed)) return false;
    const numeric = parseAmount(trimmed);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= max;
  };

  const validateFields = () => {
    let valid = true;

    if (!isValidDecimal(originalPrice, MAX_PRICE)) {
      validationErrors.originalPrice = 'Enter a valid non-negative original price up to 2 decimals.';
      valid = false;
    }

    if (!isValidDecimal(surchargeRate, MAX_SURCHARGE_PERCENTAGE)) {
      validationErrors.surchargeRate = 'Enter a valid non-negative surcharge up to 100%.';
      valid = false;
    }

    if (!isValidDecimal(currentServiceFeeRate, MAX_SERVICE_FEE_RATE)) {
      validationErrors.currentServiceFeeRate = 'Enter a valid non-negative decimal rate up to 1.0.';
      valid = false;
    }

    return valid;
  };

  const reset = () => {
    originalPrice = '';
    surchargeRate = '';
    currentServiceFeeRate = '';
    validationErrors = {
      originalPrice: '',
      surchargeRate: '',
      currentServiceFeeRate: '',
    };
    formError = '';
    hasCalculated = false;
    surchargeAmount = null;
    currentServiceFeeAmount = null;
    ooItemPrice = null;
    cartTotal = null;
    expectedDposServiceFee = null;
    expectedDposTotal = null;
    totalsMatch = false;
  };

  const calculate = () => {
    validationErrors = {
      originalPrice: '',
      surchargeRate: '',
      currentServiceFeeRate: '',
    };
    formError = '';
    hasCalculated = false;

    if (!validateFields()) {
      formError = 'Please fix the highlighted values before calculating.';
      return;
    }

    const original = parseAmount(originalPrice);
    const surchargeRateValue = parseAmount(surchargeRate);
    const currentServiceFeeRateValue = parseAmount(currentServiceFeeRate);

    const result = calculateTotals(original, surchargeRateValue, currentServiceFeeRateValue);

    surchargeAmount = result.surchargeAmount;
    currentServiceFeeAmount = result.currentServiceFeeAmount;
    ooItemPrice = result.ooItemPrice;
    cartTotal = result.cartTotal;
    expectedDposServiceFee = result.expectedDposServiceFee;
    expectedDposTotal = result.expectedDposTotal;
    totalsMatch = cartTotal === expectedDposTotal;
    hasCalculated = true;
  };

  const displayValue = (value: number | null) => (value !== null ? formatTwoDecimals(value) : '—');
</script>

<main class="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
    <section class="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.20)]">
      <div class="space-y-4">

        <h1 class="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Surcharge Calculator</h1>
        <p class="max-w-2xl text-base text-slate-600">
          Validate the Online Ordering, Cart, and DPOS behavior for a single item using percentage-based surcharge and service fee rates.
        </p>
      </div>

      <div class="mt-10 grid gap-4 sm:grid-cols-3">
        <label class="space-y-3">
          <span class="block text-sm font-medium text-slate-700">Original Price</span>
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="15.00"
            aria-label="Original Price"
            aria-invalid={validationErrors.originalPrice ? 'true' : 'false'}
            data-testid="original-price"
            value={originalPrice}
            on:input={(event) => handleInput('originalPrice', event.currentTarget.value)}
            class="w-full rounded-3xl border px-4 py-4 text-lg text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 {validationErrors.originalPrice ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
          />
          {#if validationErrors.originalPrice}
            <p class="text-sm text-rose-600">{validationErrors.originalPrice}</p>
          {/if}
        </label>

        <label class="space-y-3">
          <span class="block text-sm font-medium text-slate-700">Surcharge</span>
          <div class="relative">
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              placeholder="1"
              aria-label="Surcharge"
              aria-invalid={validationErrors.surchargeRate ? 'true' : 'false'}
              data-testid="surcharge"
              value={surchargeRate}
              on:input={(event) => handleInput('surchargeRate', event.currentTarget.value)}
              class="w-full rounded-3xl border px-4 py-4 pr-14 text-lg text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 {validationErrors.surchargeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
            />
            <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">%</span>
          </div>
          <p class="text-xs text-slate-500">Enter as percentage. Example: 1 = 1%</p>
          {#if validationErrors.surchargeRate}
            <p class="text-sm text-rose-600">{validationErrors.surchargeRate}</p>
          {/if}
        </label>

        <label class="space-y-3">
          <span class="block text-sm font-medium text-slate-700">Current Service Fee</span>
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.1"
            aria-label="Current Service Fee"
            aria-invalid={validationErrors.currentServiceFeeRate ? 'true' : 'false'}
            data-testid="current-service-fee"
            value={currentServiceFeeRate}
            on:input={(event) => handleInput('currentServiceFeeRate', event.currentTarget.value)}
            class="w-full rounded-3xl border px-4 py-4 text-lg text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 {validationErrors.currentServiceFeeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
          />
          <p class="text-xs text-slate-500">Enter as decimal rate. Example: 0.1 = 10%</p>
          {#if validationErrors.currentServiceFeeRate}
            <p class="text-sm text-rose-600">{validationErrors.currentServiceFeeRate}</p>
          {/if}
        </label>
      </div>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          on:click={reset}
          class="inline-flex justify-center rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="button"
          on:click={calculate}
          class="inline-flex justify-center rounded-3xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Calculate
        </button>
      </div>

      {#if formError}
        <div class="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700" data-testid="form-error">
          {formError}
        </div>
      {/if}
    </section>

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.18)]">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Online Ordering</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950">Online Ordering</h2>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">Item price includes surcharge</span>
        </div>

      <div class="space-y-4">
        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Original Price</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="oo-original-price">{hasCalculated ? formatTwoDecimals(parseAmount(originalPrice)) : '—'}</span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Surcharge Rate</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="oo-surcharge">{hasCalculated ? `${formatTwoDecimals(parseAmount(surchargeRate))}%` : '—'}</span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Surcharge Amount</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="oo-surcharge-amount">{displayValue(surchargeAmount)}</span>
        </div>

        <div class="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Expected OO Item Price</span>
          <span class="text-right text-xl font-semibold text-slate-950" data-testid="oo-item-price">{displayValue(ooItemPrice)}</span>
        </div>

        <p class="text-sm text-slate-500">The surcharge is included in the displayed item price.</p>
      </div>
    </section>

      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.18)]">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Cart</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950">Cart</h2>
          </div>
        </div>

      <div class="space-y-4">
        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Item Price</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="cart-item-price">{displayValue(ooItemPrice)}</span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Current Service Fee Rate</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="cart-service-fee-rate">{hasCalculated ? `${formatTwoDecimals(parseAmount(currentServiceFeeRate))}%` : '—'}</span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Current Service Fee</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="cart-service-fee">{displayValue(currentServiceFeeAmount)}</span>
        </div>

        <div class="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Expected Cart Total</span>
          <span class="text-right text-xl font-semibold text-slate-950" data-testid="cart-total">{displayValue(cartTotal)}</span>
        </div>
      </div>
    </section>

      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.18)]">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">DPOS Order Summary</p>
            <h2 class="mt-2 text-2xl font-semibold text-slate-950">DPOS Order Summary</h2>
          </div>
        </div>

      <div class="space-y-4">
        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Original Item Price</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="dpos-original-price">{hasCalculated ? formatTwoDecimals(parseAmount(originalPrice)) : '—'}</span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Surcharge Transferred to Service Fee</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="dpos-transfer-fee">{displayValue(surchargeAmount)}</span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Current Service Fee</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="dpos-current-fee">{displayValue(currentServiceFeeAmount)}</span>
        </div>

        <div class="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Expected DPOS Service Fee</span>
          <span class="text-right text-xl font-semibold text-slate-950" data-testid="dpos-service-fee">{displayValue(expectedDposServiceFee)}</span>
        </div>

        <div class="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Expected DPOS Total</span>
          <span class="text-right text-xl font-semibold text-slate-950" data-testid="dpos-total">{displayValue(expectedDposTotal)}</span>
        </div>

        <p class="text-sm text-slate-500">The original item price is preserved, while the item surcharge is added to the Service Fee.</p>
      </div>
    </section>
    </div>

    
  </div>
</main>

<style global>
  @import "tailwindcss";
</style>
