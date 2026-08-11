<script lang="ts">
  import { 
    calculateTotals, formatTwoDecimals, 
    MAX_PRICE, MAX_SURCHARGE_PERCENTAGE, MAX_SERVICE_FEE_RATE 
  } from '$lib/calculations';
  
  import ResultCard from '$lib/components/ResultCard.svelte';
  import ResultRow from '$lib/components/ResultRow.svelte';

  // --- STATE VARIABLES ---
  type FieldKey = 'originalPrice' | 'surchargeRate' | 'currentServiceFeeRate';
  let originalPrice = '';
  let surchargeRate = '';
  let currentServiceFeeRate = '';
  let validationErrors: Record<FieldKey, string> = { originalPrice: '', surchargeRate: '', currentServiceFeeRate: '' };
  let formError = '';
  let hasCalculated = false;

  // RESULTS
  let surchargeAmount: number | null = null;
  let currentServiceFeeAmount: number | null = null;
  let ooItemPrice: number | null = null;
  let cartTotal: number | null = null;
  let expectedDposServiceFee: number | null = null;
  let expectedDposTotal: number | null = null;

  // --- INPUT HANDLERS (RETAINED ALL) ---
  const sanitizeAmountInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const [integer = '', decimal = ''] = cleaned.split('.');
    return decimal ? `${integer.slice(0, 6)}.${decimal.slice(0, 2)}` : integer.slice(0, 6);
  };

  const allowInputKey = (event: KeyboardEvent) => {
    const key = event.key;
    const allowed = ['Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(key) || event.ctrlKey || event.metaKey) return;
    if (key === '.' && (event.target as HTMLInputElement).value.includes('.')) {
      event.preventDefault(); return;
    }
    if (!/^[0-9]$/.test(key)) event.preventDefault();
  };

  const handlePaste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^[0-9.]+$/.test(pasted)) event.preventDefault();
  };

  const handleInput = (field: FieldKey, rawValue: string) => {
    const sanitized = sanitizeAmountInput(rawValue);
    if (field === 'originalPrice') originalPrice = sanitized;
    if (field === 'surchargeRate') surchargeRate = sanitized;
    if (field === 'currentServiceFeeRate') currentServiceFeeRate = sanitized;
    validationErrors[field] = ''; formError = '';
  };

  // --- LOGIC ---
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
      validationErrors.originalPrice = 'Enter a valid non-negative price with up to 2 decimals.';
      valid = false;
    }

    if (!isValidDecimal(surchargeRate, MAX_SURCHARGE_PERCENTAGE)) {
      validationErrors.surchargeRate = 'Enter a valid non-negative surcharge with up to 2 decimals.';
      valid = false;
    }

    if (!isValidDecimal(currentServiceFeeRate, MAX_SERVICE_FEE_RATE)) {
      validationErrors.currentServiceFeeRate = 'Enter a valid non-negative service fee with up to 2 decimals.';
      valid = false;
    }

    return valid;
  };

  const reset = () => {
    originalPrice = ''; 
    surchargeRate = ''; 
    currentServiceFeeRate = '';
    validationErrors = { originalPrice: '', surchargeRate: '', currentServiceFeeRate: '' };
    formError = '';
    hasCalculated = false;
    surchargeAmount = null;
    currentServiceFeeAmount = null;
    ooItemPrice = null;
    cartTotal = null;
    expectedDposServiceFee = null;
    expectedDposTotal = null;
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
    hasCalculated = true;
  };

  const displayValue = (value: number | null) => (value !== null ? `$${formatTwoDecimals(value)}` : '—');
</script>

<main class="min-h-screen bg-slate-50 px-4 py-12 antialiased">
  <div class="mx-auto w-full max-w-6xl space-y-10">
    
    <!-- Input Card -->
    <section class="rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/50">
      <div class="mb-10">
        <h1 class="text-4xl font-bold tracking-tight text-slate-900">Surcharge Calculator</h1>
        <p class="mt-2 text-slate-500">Validate calculation logic across Ordering, Cart, and DPOS.</p>
      </div>

      <div class="grid gap-8 sm:grid-cols-3">
        {#each [
          { label: 'Original Price', id: 'originalPrice', val: originalPrice, placeholder: '15.00' },
          { label: 'Surcharge (%)', id: 'surchargeRate', val: surchargeRate, placeholder: '1' },
          { label: 'Service Fee (%)', id: 'currentServiceFeeRate', val: currentServiceFeeRate, placeholder: '0.1' }
        ] as input}
          <label class="flex flex-col gap-3">
            <span class="text-sm font-semibold text-slate-700">{input.label}</span>
            <input type="text" value={input.val} placeholder={input.placeholder}
              on:input={(e) => handleInput(input.id as FieldKey, e.currentTarget.value)}
              on:keydown={allowInputKey} on:paste={handlePaste}
              class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all {validationErrors[input.id as FieldKey] ? 'border-rose-300 bg-rose-50' : ''}" />
            {#if validationErrors[input.id as FieldKey]}
              <p class="text-sm text-rose-600">{validationErrors[input.id as FieldKey]}</p>
            {/if}
          </label>
        {/each}
      </div>

      <div class="mt-10 flex justify-end gap-4">
        <button on:click={reset} class="px-8 py-4 rounded-2xl font-semibold text-slate-500 hover:bg-slate-100 transition">Reset</button>
        <button on:click={calculate} class="px-10 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-blue-600 transition shadow-lg">Calculate</button>
      </div>

      {#if formError}
        <div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {formError}
        </div>
      {/if}
    </section>

    <!-- Results Grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <ResultCard title="Online Ordering" iconName="Globe" badgeText="Item price includes surcharge">
        <ResultRow label="Original Price" value={hasCalculated ? `$${formatTwoDecimals(parseAmount(originalPrice))}` : '—'} />
        <ResultRow label="Surcharge Rate" value={hasCalculated ? `${formatTwoDecimals(parseAmount(surchargeRate))}%` : '—'} />
        <ResultRow label="Surcharge Amount" value={displayValue(surchargeAmount)} />
        <ResultRow label="Expected OO Item Price" value={displayValue(ooItemPrice)} isTotal={true} />
      </ResultCard>

      <ResultCard title="Cart" iconName="ShoppingCart" badgeText="Service fee applied on cart">
        <ResultRow label="Item Price" value={displayValue(ooItemPrice)} />
        <ResultRow label="Current Service Fee Rate" value={hasCalculated ? `${formatTwoDecimals(parseAmount(currentServiceFeeRate))}%` : '—'} />
        <ResultRow label="Current Service Fee" value={displayValue(currentServiceFeeAmount)} />
        <ResultRow label="Expected Cart Total" value={displayValue(cartTotal)} isTotal={true} />
      </ResultCard>

      <ResultCard title="DPOS Order" iconName="Monitor" badgeText="Surcharge added to Service Fee" footerText="Original item price is preserved; the surcharge amount is transferred to the Service Fee line.">
        <ResultRow label="Original Item Price" value={hasCalculated ? `$${formatTwoDecimals(parseAmount(originalPrice))}` : '—'} />
        <ResultRow label="Surcharge Transferred to Service Fee" value={displayValue(surchargeAmount)} />
        <ResultRow label="Current Service Fee" value={displayValue(currentServiceFeeAmount)} />
        <ResultRow label="Expected DPOS Service Fee" value={displayValue(expectedDposServiceFee)} isTotal={true} />
        <ResultRow label="Expected DPOS Total" value={displayValue(expectedDposTotal)} isTotal={true} />
      </ResultCard>
    </div>
  </div>
</main>

<style>
  @import "tailwindcss";
</style>