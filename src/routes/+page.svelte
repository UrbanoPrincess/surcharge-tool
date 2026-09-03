<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';

  import {
    calculateCartTotal,
    calculateOoItemPrice,
    calculateServiceFeeAmount,
    calculateSurchargeAmount,
    formatTwoDecimals,
    MAX_PRICE,
    MAX_SURCHARGE_PERCENTAGE,
    MAX_SERVICE_FEE_RATE,
    roundHalfUp,
  } from '$lib/calculations';

  import {
    startOrderPolling,
    stopOrderPolling,
  } from '$lib/orderPolling';

  type FieldKey =
    | 'originalPrice'
    | 'surchargeRate'
    | 'currentServiceFeeRate';

  type Item = { price: string; error: string };

  let items: Item[] = [{ price: '', error: '' }];
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
  let calculatedItems: { original: number; surcharge: number; ooPrice: number }[] = [];
  let cartTotal: number | null = null;
  let expectedDposServiceFee: number | null = null;
  let expectedDposTotal: number | null = null;
  let totalsMatch = false;
  let showCalculationBreakdown = false;
  let showItems = false;
  let itemInputs: HTMLInputElement[] = [];
  let itemsPopover: HTMLDivElement;
  let itemsTrigger: HTMLButtonElement;

  const dismissItemsPopover = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!itemsPopover?.contains(target) && !itemsTrigger?.contains(target)) {
      showItems = false;
    }
  };

  const handleItemsEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') showItems = false;
  };

  onMount(() => {
    document.addEventListener('click', dismissItemsPopover);
    document.addEventListener('keydown', handleItemsEscape);

    return () => {
      document.removeEventListener('click', dismissItemsPopover);
      document.removeEventListener('keydown', handleItemsEscape);
    };
  });

  const sanitizeAmountInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');

    const [integer = '', decimal = ''] = cleaned.split('.');
    const limitedInteger = integer.slice(0, 6);
    const limitedDecimal = decimal.slice(0, 2);

    if (limitedDecimal) {
      return `${limitedInteger}.${limitedDecimal}`;
    }

    if (cleaned.includes('.')) {
      return `${limitedInteger}.`;
    }

    return limitedInteger;
  };

  const allowInputKey = (event: KeyboardEvent) => {
    const key = event.key;
    if (key === 'Tab' || key === 'Backspace' || key === 'Delete' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      return;
    }

    if (key === '.') {
      const input = event.target as HTMLInputElement;
      if (input.value.includes('.')) {
        event.preventDefault();
      }
      return;
    }

    if (/^[0-9]$/.test(key)) {
      const input = event.target as HTMLInputElement;
      const value = input.value;
      const selectionStart = input.selectionStart ?? value.length;
      const selectionEnd = input.selectionEnd ?? value.length;
      const [integerPart = ''] = value.split('.');
      const selectedIntegerChars = value.slice(selectionStart, selectionEnd).replace(/\D/g, '').length;
      const integerLengthAfterEdit = integerPart.length - selectedIntegerChars + 1;
      const cursorInInteger = selectionStart <= integerPart.length;

      if (cursorInInteger && integerLengthAfterEdit > 6) {
        event.preventDefault();
      }
      return;
    }

    event.preventDefault();
  };

  const handlePaste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/^[0-9.]+$/.test(pasted)) {
      event.preventDefault();
      return;
    }

    const input = event.target as HTMLInputElement;
    const [integerPart = '', decimalPart = ''] = pasted.split('.');
    if (integerPart.length > 6 || decimalPart.length > 2 || (pasted.match(/\./g) || []).length > 1) {
      event.preventDefault();
    }
  };

  const handleInput = (field: FieldKey, rawValue: string, itemIndex = 0) => {
    const sanitized = sanitizeAmountInput(rawValue);

    if (field === 'originalPrice') {
      items[itemIndex].price = sanitized;
      items[itemIndex].error = '';
      items = items;
    }
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

  const isValidOptionalDecimal = (value: string, max: number) => {
    const trimmed = value.trim();
    if (trimmed === '') return true;
    return isValidDecimal(trimmed, max);
  };

  const parseOptionalAmount = (value: string) => (value.trim() === '' ? 0 : parseAmount(value));

  const validateFields = () => {
    let valid = true;

    if (!isValidDecimal(items[0].price, MAX_PRICE)) {
      validationErrors.originalPrice = 'Enter a valid non-negative price with up to 2 decimals.';
      valid = false;
    }

    items = items.map((item, index) => ({
      ...item,
      error: index === 0 || item.price.trim() === '' || isValidDecimal(item.price, MAX_PRICE)
        ? ''
        : 'Enter a valid non-negative price with up to 2 decimals.',
    }));

    if (!isValidDecimal(surchargeRate, MAX_SURCHARGE_PERCENTAGE)) {
      validationErrors.surchargeRate = 'Enter a valid non-negative surcharge with up to 2 decimals.';
      valid = false;
    }

    if (!isValidOptionalDecimal(currentServiceFeeRate, MAX_SERVICE_FEE_RATE)) {
      validationErrors.currentServiceFeeRate = 'Enter a valid non-negative service fee with up to 2 decimals.';
      valid = false;
    }

    return valid;
  };

  const addItem = async () => {
    const latestIndex = items.length - 1;
    const latestItem = items[latestIndex];
    if (!isValidDecimal(latestItem.price, MAX_PRICE)) {
      latestItem.error = 'Enter a valid price before adding another item.';
      items = items;
      showItems = true;
      await tick();
      itemInputs[latestIndex]?.focus();
      return;
    }

    items = [...items, { price: '', error: '' }];
    showItems = true;
    await tick();
    itemInputs[items.length - 1]?.focus();
  };

  const removeItem = (itemIndex: number) => {
    items = items.filter((_, index) => index !== itemIndex);
    if (items.length === 1) showItems = false;
    calculatedItems = [];
    hasCalculated = false;
  };

  const reset = () => {
    items = [{ price: '', error: '' }];
    showItems = false;
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
    calculatedItems = [];
    cartTotal = null;
    expectedDposServiceFee = null;
    expectedDposTotal = null;
    totalsMatch = false;
    showCalculationBreakdown = false;
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

    const surchargeRateValue = parseAmount(surchargeRate);
    const currentServiceFeeRateValue = parseOptionalAmount(currentServiceFeeRate);

    const validItems = items
      .filter((item, index) => index === 0 || isValidDecimal(item.price, MAX_PRICE))
      .map((item) => {
        const original = parseAmount(item.price);
        const surcharge = calculateSurchargeAmount(original, surchargeRateValue);
        return { original, surcharge, ooPrice: calculateOoItemPrice(original, surcharge) };
      });
    const originalTotal = validItems.reduce((total, item) => total + item.original, 0);
    const surchargeTotal = validItems.reduce((total, item) => total + item.surcharge, 0);
    const ooTotal = validItems.reduce((total, item) => total + item.ooPrice, 0);
    const currentFee = calculateServiceFeeAmount(ooTotal, currentServiceFeeRateValue);
    const result = {
      surchargeAmount: surchargeTotal,
      currentServiceFeeAmount: currentFee,
      ooItemPrice: ooTotal,
      cartTotal: calculateCartTotal(ooTotal, currentFee),
      expectedDposServiceFee: roundHalfUp(currentFee + surchargeTotal),
      expectedDposTotal: roundHalfUp(originalTotal + roundHalfUp(currentFee + surchargeTotal)),
    };

    calculatedItems = validItems;
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

  const formatDecimalMultiplier = (percentage: number) => {
    const rateDecimals = percentage.toString().includes('.')
      ? percentage.toString().split('.')[1].length
      : 0;
    const precision = Math.max(2, rateDecimals + 2);
    return (percentage / 100)
      .toFixed(precision)
      .replace(/(\.\d*?[1-9])0+$/, '$1')
      .replace(/\.0+$/, '');
  };

  const toggleCalculationBreakdown = () => {
    showCalculationBreakdown = !showCalculationBreakdown;
  };

  let orderData: unknown = null;
let orderError = '';
let isPolling = false;

function startPolling() {
  isPolling = true;

  startOrderPolling(
    (data) => {
      orderData = data;
      orderError = '';

      console.log('Order API:', data);
    },
    (error) => {
      orderError =
        error instanceof Error ? error.message : 'Failed to fetch orders';

      console.error('Order API error:', error);
    }
  );
}

function stopPolling() {
  isPolling = false;
  stopOrderPolling();
}

onDestroy(() => {
  stopOrderPolling();
});
</script>

<main class="min-h-screen bg-[#fafafa] px-4 py-6 text-slate-900 tabular-nums sm:py-10">
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-5">
    <section class="relative z-20 overflow-visible rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)] sm:p-7">
      <div class="space-y-2">
<!--
<button
  type="button"
  on:click={isPolling ? stopPolling : startPolling}
  class="rounded-3xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
>
  {isPolling ? 'Stop Polling' : 'Start Polling'}
</button>

        <p class="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">QA Utility / Calculation Suite</p>-->
        <h1 class="text-3xl font-bold tracking-tight text-slate-950">Surcharge Calculator</h1>
        <p class="max-w-2xl text-sm text-slate-500">
          Validate the Online Ordering, Cart, and DPOS behavior for surcharge and service fee calculations.
        </p>
      </div>

      <div class="mt-8 grid min-w-0 gap-4 md:grid-cols-3">
        <label class="relative min-w-0 space-y-2">
          <span class="block text-sm font-semibold text-slate-800">Original Price</span>
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="15.00"
            aria-label="Original Price"
            aria-invalid={validationErrors.originalPrice ? 'true' : 'false'}
            data-testid="original-price"
            value={items[0].price}
            on:input={(event) => handleInput('originalPrice', event.currentTarget.value)}
            on:keydown={allowInputKey}
            on:paste={handlePaste}
            class="w-full rounded-xl border px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 {validationErrors.originalPrice ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
          />
          <p class="text-xs text-slate-500">Enter the first item price.</p>
          {#if validationErrors.originalPrice}
            <p class="text-sm text-rose-600">{validationErrors.originalPrice}</p>
          {/if}
          <div class="relative mt-5">
            <button type="button" bind:this={itemsTrigger} data-testid="add-item" on:click={addItem} class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400">
              <span class="text-base leading-none">+</span> Add Item <span class="font-mono text-slate-500">{items.length}</span>
            </button>
            {#if showItems}
              <div bind:this={itemsPopover} class="absolute left-0 top-full z-10 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_12px_28px_-14px_rgba(15,23,42,0.45)]">
                <div class="flex items-center justify-between border-b border-slate-200 px-1 pb-2 text-sm font-semibold text-slate-800">
                  <span>Items</span>
                  <button type="button" aria-label="Close items" on:click={() => (showItems = false)} class="text-base font-normal text-slate-500 hover:text-slate-900">×</button>
                </div>
                <div class="max-h-[300px] space-y-2 overflow-y-auto py-2">
                  {#each items as item, itemIndex}
                    <div class="flex items-center gap-2">
                      <span class="w-12 shrink-0 text-sm text-slate-600">Item {itemIndex + 1}</span>
                      <input type="text" inputmode="decimal" autocomplete="off" placeholder="15.00" aria-label={`Item ${itemIndex + 1} Price`} aria-invalid={item.error ? 'true' : 'false'} data-testid={`item-price-${itemIndex + 1}`} bind:this={itemInputs[itemIndex]} value={item.price} on:input={(event) => handleInput('originalPrice', event.currentTarget.value, itemIndex)} on:keydown={allowInputKey} on:paste={handlePaste} class="min-w-0 flex-1 rounded-lg border px-3 py-2 text-base font-medium text-slate-900 outline-none focus:border-slate-400 {item.error ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}" />
                      {#if items.length > 1}<button type="button" aria-label={`Remove Item ${itemIndex + 1}`} on:click={() => removeItem(itemIndex)} class="text-base text-slate-500 hover:text-slate-900">×</button>{/if}
                    </div>
                    {#if item.error}<p class="text-xs text-rose-600">{item.error}</p>{/if}
                  {/each}
                </div>
                <button type="button" on:click={addItem} class="w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">Add another item</button>
              </div>
            {/if}
          </div>
        </label>

        <label class="min-w-0 space-y-3">
          <span class="block text-sm font-semibold text-slate-800">Surcharge</span>
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
              class="w-full rounded-xl border px-4 py-3 pr-14 text-base font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 {validationErrors.surchargeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
              on:keydown={allowInputKey}
              on:paste={handlePaste}
            />
            <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">%</span>
          </div>
          <p class="text-xs text-slate-500">Enter percentage (e.g., 1% = 0.01).</p>
          {#if validationErrors.surchargeRate}
            <p class="text-sm text-rose-600">{validationErrors.surchargeRate}</p>
          {/if}
        </label>

        <label class="min-w-0 space-y-3">
          <span class="block text-sm font-semibold text-slate-800">Current Service Fee</span>
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
            on:keydown={allowInputKey}
            on:paste={handlePaste}
            class="w-full rounded-xl border px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 {validationErrors.currentServiceFeeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
          />
          <p class="text-xs text-slate-500">Fixed fee applied to the cart.</p>
          {#if validationErrors.currentServiceFeeRate}
            <p class="text-sm text-rose-600">{validationErrors.currentServiceFeeRate}</p>
          {/if}
        </label>
      </div>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          on:click={reset}
          class="inline-flex justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="button"
          on:click={calculate}
          disabled={!isValidDecimal(items[0].price, MAX_PRICE) || !isValidDecimal(surchargeRate, MAX_SURCHARGE_PERCENTAGE)}
          class="inline-flex justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]">
      <div class="p-6">
        <button
          type="button"
          aria-expanded={showCalculationBreakdown}
          data-testid="calculation-breakdown-toggle"
          on:click={toggleCalculationBreakdown}
          class="inline-flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100 sm:text-base"
        >
          <span>{showCalculationBreakdown ? 'Hide Calculation Breakdown' : 'Show Calculation Breakdown'}</span>
          <span class="text-slate-500">{showCalculationBreakdown ? '−' : '+'}</span>
        </button>
      </div>

      {#if showCalculationBreakdown}
        <div class="border-t border-slate-200 px-6 pb-6" data-testid="calculation-breakdown">
          {#if hasCalculated}
            {@const surchargeRateValue = parseAmount(surchargeRate)}
            {@const serviceFeeInput = parseOptionalAmount(currentServiceFeeRate)}
            {@const surchargeDecimal = formatDecimalMultiplier(surchargeRateValue)}

            <div class="grid min-w-0 grid-cols-1 gap-6 pt-5 md:grid-cols-2 lg:grid-cols-3">
              <div class="flex min-w-0 flex-col">
                <h3 class="text-xs font-semibold leading-4 text-slate-600">Surcharge</h3>
                {#each calculatedItems as item}
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">{formatTwoDecimals(item.original)} × {surchargeDecimal} = {formatTwoDecimals(item.surcharge)}</p>
                {/each}
              </div>

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">Expected OO Item Price</h3>
                {#each calculatedItems as item}
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">{formatTwoDecimals(item.original)} + {formatTwoDecimals(item.surcharge)} = {formatTwoDecimals(item.ooPrice)}</p>
                {/each}
              </div>

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">Current Service Fee</h3>
                {#if currentServiceFeeRate.trim() === ''}
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">
                    {displayValue(ooItemPrice)} × 0.00 = {displayValue(currentServiceFeeAmount)}
                  </p>
                {:else}
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">
                    {displayValue(ooItemPrice)} × {formatTwoDecimals(serviceFeeInput)} = {displayValue(currentServiceFeeAmount)}
                  </p>
                {/if}
              </div>

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">Expected Cart Total</h3>
                <p class="break-words font-mono text-sm leading-6 text-slate-800">
                  {displayValue(ooItemPrice)} + {displayValue(currentServiceFeeAmount)} = {displayValue(cartTotal)}
                </p>
              </div>

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">DPOS Service Fee</h3>
                <p class="break-words font-mono text-sm leading-6 text-slate-800">
                  {displayValue(currentServiceFeeAmount)} + {displayValue(surchargeAmount)} = {displayValue(expectedDposServiceFee)}
                </p>
              </div>

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">Expected DPOS Total</h3>
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">
                    {formatTwoDecimals(calculatedItems.reduce((total, item) => total + item.original, 0))} + {displayValue(expectedDposServiceFee)} = {displayValue(expectedDposTotal)}
                  </p>
              </div>
            </div>
          {:else}
            <p class="pt-5 text-sm text-slate-500">Enter values and click Calculate to view the breakdown.</p>
          {/if}
        </div>
      {/if}
    </section>

    <div class="grid min-w-0 gap-4 md:grid-cols-3">
      <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-950">Online Ordering</h2>
          </div>

        </div>

      <div class="space-y-2">
        <div class="mb-1 grid grid-cols-3 gap-5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span class="text-center">Original</span><span class="text-center">Surcharge</span><span class="text-center">OO Price</span>
        </div>
        {#each calculatedItems as item, index}
          <div class="grid grid-cols-3 items-center gap-5 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[15px] text-slate-900">
            <span class="text-center" data-testid={index === 0 ? 'oo-original-price' : `oo-original-price-${index + 1}`}>{formatTwoDecimals(item.original)}</span>
            <span class="text-center" data-testid={index === 0 ? 'oo-surcharge-amount' : `oo-surcharge-amount-${index + 1}`}>{formatTwoDecimals(item.surcharge)}</span>
            <span class="text-center font-semibold" data-testid={index === 0 ? 'oo-item-price' : `oo-item-price-${index + 1}`}>{formatTwoDecimals(item.ooPrice)}</span>
          </div>
        {:else}
          <div class="grid grid-cols-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"><span class="text-center">—</span><span class="text-center">—</span><span class="text-center" data-testid="oo-item-price">—</span></div>
        {/each}
        <span class="sr-only" data-testid="oo-surcharge">{hasCalculated ? `${formatTwoDecimals(parseAmount(surchargeRate))}%` : '—'}</span>

        <p class="text-sm text-slate-500">The surcharge is included in the displayed item price.</p>
      </div>
    </section>

      <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
           
            <h2 class="text-xl font-semibold text-slate-950">Cart</h2>
          </div>
        </div>

      <div class="space-y-3">
        <div class="space-y-2">
          <p class="px-1 text-xs font-medium text-slate-600">Item Price</p>
          {#each calculatedItems as item, index}
            <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
              <span class="text-sm font-medium text-slate-600">Item {index + 1}</span>
              <span class="text-right text-[15px] font-medium text-slate-950" data-testid={index === 0 ? 'cart-item-price' : `cart-item-price-${index + 1}`}>{formatTwoDecimals(item.ooPrice)}</span>
            </div>
          {:else}
            <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]"><span class="text-sm font-medium text-slate-600">Item 1</span><span class="text-right text-sm font-semibold text-slate-950" data-testid="cart-item-price">—</span></div>
          {/each}
        </div>

        <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Current Service Fee</span>
          <span class="text-right text-[15px] font-medium text-slate-950" data-testid="cart-service-fee">{displayValue(currentServiceFeeAmount)}</span>
        </div>

        <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-semibold text-slate-900">Expected Cart Total</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="cart-total">{displayValue(cartTotal)}</span>
        </div>
      </div>
    </section>

      <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
        
            <h2 class="text-xl font-semibold text-slate-950">DPOS Order Summary</h2>
          </div>
        </div>

      <div class="space-y-3">
        <div class="space-y-2">
          <p class="px-1 text-xs font-medium text-slate-600">Original Item Price</p>
          {#each calculatedItems as item, index}
            <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
              <span class="text-sm font-medium text-slate-600">Item {index + 1}</span>
              <span class="text-right text-[15px] font-medium text-slate-950" data-testid={index === 0 ? 'dpos-original-price' : `dpos-original-price-${index + 1}`}>{formatTwoDecimals(item.original)}</span>
            </div>
          {:else}
            <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]"><span class="text-sm font-medium text-slate-600">Item 1</span><span class="text-right text-sm font-semibold text-slate-950" data-testid="dpos-original-price">—</span></div>
          {/each}
        </div>

        <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Surcharge Transferred to Service Fee</span>
          <span class="text-right text-[15px] font-medium text-slate-950" data-testid="dpos-transfer-fee">{displayValue(surchargeAmount)}</span>
        </div>

        <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-medium text-slate-600">Current Service Fee</span>
          <span class="text-right text-[15px] font-medium text-slate-950" data-testid="dpos-current-fee">{displayValue(currentServiceFeeAmount)}</span>
        </div>

        <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-semibold text-slate-900">Expected DPOS Service Fee</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="dpos-service-fee">{displayValue(expectedDposServiceFee)}</span>
        </div>

        <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-semibold text-slate-900">Expected DPOS Total</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="dpos-total">{displayValue(expectedDposTotal)}</span>
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
