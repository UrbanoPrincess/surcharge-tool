<script lang="ts">
  import { calculateSurcharge, calculateFinalPrice } from '$lib/calculations';

  let originalPrice: string | number = '';
  let surchargeRate: string | number = '';
  let surchargeAmount: number | null = null;
  let finalPrice: number | null = null;
  let errorMessage = '';

  const formatCurrency = (value: number) => `₱${value.toFixed(2)}`;

  const normalizeValue = (value: string | number) => String(value ?? '').trim();

  const isValidNonNegativeNumber = (value: string | number) => {
    const normalized = normalizeValue(value);
    if (normalized === '') {
      return false;
    }

    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric >= 0;
  };

  const parseNumber = (value: string | number) => Number(normalizeValue(value));

  function calculate() {
    errorMessage = '';
    surchargeAmount = null;
    finalPrice = null;

    if (!isValidNonNegativeNumber(originalPrice)) {
      errorMessage = 'Original price must be a non-negative number.';
      return;
    }

    if (!isValidNonNegativeNumber(surchargeRate)) {
      errorMessage = 'Surcharge rate must be a non-negative percentage.';
      return;
    }

    const original = parseNumber(originalPrice);
    const rate = parseNumber(surchargeRate);

    surchargeAmount = calculateSurcharge(original, rate);
    finalPrice = calculateFinalPrice(original, rate);
  }
</script>

<main class="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
  <div class="mx-auto w-full max-w-2xl space-y-8 px-4">
    <section class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
      <div class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Business surcharge tool</p>
        <h1 class="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">Surcharge Calculator</h1>
        <p class="mt-3 max-w-2xl text-slate-600">Calculate an item surcharge from the original price and surcharge percentage only.</p>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <label class="space-y-3">
          <span class="text-sm font-medium text-slate-700">Original Price</span>
          <input
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0"
            placeholder="23.50"
            aria-label="Original Price"
            data-testid="original-price"
            value={originalPrice}
            on:input={(event) => {
              originalPrice = event.currentTarget.value;
              errorMessage = '';
              surchargeAmount = null;
              finalPrice = null;
            }}
            class="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label class="space-y-3">
          <span class="text-sm font-medium text-slate-700">Surcharge Rate</span>
          <div class="relative">
            <input
              type="number"
              inputmode="decimal"
              step="0.01"
              min="0"
              placeholder="5"
              aria-label="Surcharge Rate"
              data-testid="surcharge-rate"
              value={surchargeRate}
              on:input={(event) => {
                surchargeRate = event.currentTarget.value;
                errorMessage = '';
                surchargeAmount = null;
                finalPrice = null;
              }}
              class="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 pr-16 text-lg text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">%</span>
          </div>
        </label>
      </div>

      <div class="mt-6">
        <button
          type="button"
          on:click={calculate}
          class="inline-flex w-full justify-center rounded-3xl bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 active:bg-slate-700 sm:w-auto"
          data-testid="calculate-button"
        >
          Calculate Surcharge
        </button>
      </div>

      {#if errorMessage}
        <div class="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700" data-testid="error-message">
          {errorMessage}
        </div>
      {/if}
    </section>

    <section class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-slate-950">Results</h2>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">Surcharge-only</span>
      </div>

      <div class="space-y-4">
        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-2">
                <span class="text-sm font-medium text-slate-600">Original Price</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="result-original">
            {originalPrice.trim() !== '' && Number(originalPrice.trim()) >= 0 ? `₱${Number(originalPrice.trim()).toFixed(2)}` : '—'}
          </span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-2">
          <span class="text-sm font-medium text-slate-600">Surcharge Rate</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="result-rate">
            {surchargeRate.trim() !== '' && Number(surchargeRate.trim()) >= 0 ? `${Number(surchargeRate.trim()).toFixed(2)}%` : '—'}
          </span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-2">
          <span class="text-sm font-medium text-slate-600">Surcharge Amount</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="surcharge-amount">
            {surchargeAmount !== null ? formatCurrency(surchargeAmount) : '—'}
          </span>
        </div>

        <div class="grid gap-4 rounded-3xl bg-slate-50 p-5 sm:grid-cols-2">
          <span class="text-sm font-medium text-slate-600">Final Price</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="final-price">
            {finalPrice !== null ? formatCurrency(finalPrice) : '—'}
          </span>
        </div>
      </div>
    </section>
  </div>
</main>

<style global>
  @import "tailwindcss";
</style>
