<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { ObjectsColumnSolid } from 'flowbite-svelte-icons';

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
    | 'shopEmbeddedFeeRate'
    | 'tableEmbeddedFeeRate'
    | 'currentServiceFeeRate';

  type Item = { price: string; error: string };
  type FeeFlowItem = { original: number; embeddedFee: number; ooPrice: number };
  type FeeFlowResult = {
    items: FeeFlowItem[];
    embeddedFeeAmount: number;
    ooItemPrice: number;
    currentServiceFeeAmount: number;
    cartTotal: number;
    expectedDposServiceFee: number;
    expectedDposTotal: number;
  };

  let items: Item[] = [{ price: '', error: '' }];
  let surchargeRate = '';
  let shopEmbeddedFeeRate = '';
  let tableEmbeddedFeeRate = '';
  let currentServiceFeeRate = '';

  let validationErrors: Record<FieldKey, string> = {
    originalPrice: '',
    surchargeRate: '',
    shopEmbeddedFeeRate: '',
    tableEmbeddedFeeRate: '',
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
  let shopResults: FeeFlowResult | null = null;
  let tableResults: FeeFlowResult | null = null;
  let totalsMatch = false;
  let showCalculationBreakdown = false;
  let showItems = false;
  let showEmbeddedFeesPopover = false;
  let showComparisonView = false;
  let isPlatformFeeTooltipVisible = false;
  let isEmbeddedItemFeeTooltipVisible = false;
  let embeddedItemFeeField: HTMLDivElement;
  let platformFeeField: HTMLDivElement;
  let itemInputs: HTMLInputElement[] = [];
  let itemsPopover: HTMLDivElement;
  let itemsTrigger: HTMLButtonElement;
  let embeddedFeesPopover: HTMLDivElement | undefined = undefined;
  let embeddedFeesTrigger: HTMLButtonElement | undefined = undefined;

  const dismissItemsPopover = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!itemsPopover?.contains(target) && !itemsTrigger?.contains(target)) {
      showItems = false;
    }
    if (!embeddedFeesPopover?.contains(target) && !embeddedFeesTrigger?.contains(target)) {
      showEmbeddedFeesPopover = false;
    }
    if (!embeddedItemFeeField?.contains(target)) isEmbeddedItemFeeTooltipVisible = false;
    if (!platformFeeField?.contains(target)) isPlatformFeeTooltipVisible = false;
  };

  const openPlatformFeeTooltip = () => {
    isPlatformFeeTooltipVisible = true;
    isEmbeddedItemFeeTooltipVisible = false;
  };

  const openEmbeddedItemFeeTooltip = () => {
    isEmbeddedItemFeeTooltipVisible = true;
    isPlatformFeeTooltipVisible = false;
  };

  const closePlatformFeeTooltipOnLeave = (event: MouseEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !platformFeeField?.contains(nextTarget)) {
      isPlatformFeeTooltipVisible = false;
    }
  };

  const closeEmbeddedItemFeeTooltipOnLeave = (event: MouseEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !embeddedItemFeeField?.contains(nextTarget)) {
      isEmbeddedItemFeeTooltipVisible = false;
    }
  };

  const handleItemsEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      showItems = false;
      showEmbeddedFeesPopover = false;
    }
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
    if (field === 'shopEmbeddedFeeRate') shopEmbeddedFeeRate = sanitized;
    if (field === 'tableEmbeddedFeeRate') tableEmbeddedFeeRate = sanitized;
    if (field === 'currentServiceFeeRate') currentServiceFeeRate = sanitized;

    if (parseOptionalAmount(shopEmbeddedFeeRate) === 0 && parseOptionalAmount(tableEmbeddedFeeRate) === 0) {
      showComparisonView = false;
    }

    isPlatformFeeTooltipVisible = false;
    isEmbeddedItemFeeTooltipVisible = false;
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
  const hasEmbeddedItemFee = () => parseOptionalAmount(surchargeRate) > 0;
  const hasShopEmbeddedFee = () => parseOptionalAmount(shopEmbeddedFeeRate) > 0;
  const hasTableEmbeddedFee = () => parseOptionalAmount(tableEmbeddedFeeRate) > 0;
  const hasPlatformFee = () => parseOptionalAmount(currentServiceFeeRate) > 0;

  const hasValidFeeSelection = () =>
    !(hasEmbeddedItemFee() && hasPlatformFee()) &&
    (hasEmbeddedItemFee() || hasPlatformFee() || hasShopEmbeddedFee() || hasTableEmbeddedFee());

  const canCalculate = () =>
    isValidDecimal(items[0].price, MAX_PRICE) &&
    isValidOptionalDecimal(surchargeRate, MAX_SURCHARGE_PERCENTAGE) &&
    isValidOptionalDecimal(shopEmbeddedFeeRate, MAX_SURCHARGE_PERCENTAGE) &&
    isValidOptionalDecimal(tableEmbeddedFeeRate, MAX_SURCHARGE_PERCENTAGE) &&
    isValidOptionalDecimal(currentServiceFeeRate, MAX_SERVICE_FEE_RATE) &&
    hasValidFeeSelection();

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

    if (!isValidOptionalDecimal(surchargeRate, MAX_SURCHARGE_PERCENTAGE)) {
      validationErrors.surchargeRate = 'Enter a valid non-negative embedded item fee with up to 2 decimals.';
      valid = false;
    }

    if (!isValidOptionalDecimal(shopEmbeddedFeeRate, MAX_SURCHARGE_PERCENTAGE)) {
      validationErrors.shopEmbeddedFeeRate = 'Enter a valid non-negative shop embedded fee with up to 2 decimals.';
      valid = false;
    }

    if (!isValidOptionalDecimal(tableEmbeddedFeeRate, MAX_SURCHARGE_PERCENTAGE)) {
      validationErrors.tableEmbeddedFeeRate = 'Enter a valid non-negative table embedded fee with up to 2 decimals.';
      valid = false;
    }

    if (!isValidOptionalDecimal(currentServiceFeeRate, MAX_SERVICE_FEE_RATE)) {
      validationErrors.currentServiceFeeRate = 'Enter a valid non-negative platform fee with up to 2 decimals.';
      valid = false;
    }

    if (!hasValidFeeSelection()) {
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
    shopResults = null;
    tableResults = null;
    hasCalculated = false;
  };

  const reset = () => {
    items = [{ price: '', error: '' }];
    showItems = false;
    showEmbeddedFeesPopover = false;
    showComparisonView = false;
    surchargeRate = '';
    shopEmbeddedFeeRate = '';
    tableEmbeddedFeeRate = '';
    currentServiceFeeRate = '';
    validationErrors = {
      originalPrice: '',
      surchargeRate: '',
      shopEmbeddedFeeRate: '',
      tableEmbeddedFeeRate: '',
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
    shopResults = null;
    tableResults = null;
    totalsMatch = false;
    showCalculationBreakdown = false;
  };

  const calculate = () => {
    validationErrors = {
      originalPrice: '',
      surchargeRate: '',
      shopEmbeddedFeeRate: '',
      tableEmbeddedFeeRate: '',
      currentServiceFeeRate: '',
    };
    formError = '';
    hasCalculated = false;

    if (!validateFields()) {
      formError = 'Please fix the highlighted values before calculating.';
      return;
    }

    const surchargeRateValue = parseOptionalAmount(surchargeRate);
    const shopRateValue = parseOptionalAmount(shopEmbeddedFeeRate);
    const tableRateValue = parseOptionalAmount(tableEmbeddedFeeRate);
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

    const calculateFeeFlow = (rate: number): FeeFlowResult => {
      const feeItems = validItems.map((item) => {
        const embeddedFee = calculateSurchargeAmount(item.original, rate);
        return {
          original: item.original,
          embeddedFee,
          ooPrice: calculateOoItemPrice(item.original, embeddedFee),
        };
      });
      const feeTotal = feeItems.reduce((total, item) => total + item.embeddedFee, 0);
      const flowOriginalTotal = feeItems.reduce((total, item) => total + item.original, 0);
      const flowOoTotal = feeItems.reduce((total, item) => total + item.ooPrice, 0);
      const flowCurrentServiceFee = calculateServiceFeeAmount(flowOoTotal, currentServiceFeeRateValue);
      const flowDposServiceFee = roundHalfUp(flowCurrentServiceFee + feeTotal);

      return {
        items: feeItems,
        embeddedFeeAmount: feeTotal,
        ooItemPrice: flowOoTotal,
        currentServiceFeeAmount: flowCurrentServiceFee,
        cartTotal: calculateCartTotal(flowOoTotal, flowCurrentServiceFee),
        expectedDposServiceFee: flowDposServiceFee,
        expectedDposTotal: roundHalfUp(flowOriginalTotal + flowDposServiceFee),
      };
    };

    calculatedItems = validItems;
    surchargeAmount = result.surchargeAmount;
    currentServiceFeeAmount = result.currentServiceFeeAmount;
    ooItemPrice = result.ooItemPrice;
    cartTotal = result.cartTotal;
    expectedDposServiceFee = result.expectedDposServiceFee;
    expectedDposTotal = result.expectedDposTotal;
    shopResults = hasShopEmbeddedFee() ? calculateFeeFlow(shopRateValue) : null;
    tableResults = hasTableEmbeddedFee() ? calculateFeeFlow(tableRateValue) : null;
    totalsMatch = cartTotal === expectedDposTotal;
    hasCalculated = true;
  };

  const getItemComparisonResults = (): FeeFlowResult | null => {
    if (!hasCalculated) return null;

    return {
      items: calculatedItems.map((item) => ({
        original: item.original,
        embeddedFee: item.surcharge,
        ooPrice: item.ooPrice,
      })),
      embeddedFeeAmount: surchargeAmount ?? 0,
      ooItemPrice: ooItemPrice ?? 0,
      currentServiceFeeAmount: currentServiceFeeAmount ?? 0,
      cartTotal: cartTotal ?? 0,
      expectedDposServiceFee: expectedDposServiceFee ?? 0,
      expectedDposTotal: expectedDposTotal ?? 0,
    };
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
        <h1 class="text-3xl font-bold tracking-tight text-slate-950">Embedded Item Fee Calculator</h1>
        <p class="max-w-2xl text-sm text-slate-500">
          Validate the Online Ordering, Cart, and DPOS behavior for embedded item fee and platform fee calculations.
        </p>
      </div>

      <div class="mt-8 grid min-w-0 gap-4 md:grid-cols-3">
        <label class="relative min-w-0 space-y-3">
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
          <span class="block text-sm font-semibold text-slate-800">Embedded Item Fee</span>
          <div class="relative" bind:this={embeddedItemFeeField}>
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              placeholder="1"
              aria-label="Embedded Item Fee"
              aria-invalid={validationErrors.surchargeRate ? 'true' : 'false'}
              data-testid="surcharge"
              disabled={hasPlatformFee()}
              value={surchargeRate}
              on:input={(event) => handleInput('surchargeRate', event.currentTarget.value)}
              class="w-full rounded-xl border px-4 py-3 pr-14 text-base font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-75 {validationErrors.surchargeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
              on:keydown={allowInputKey}
              on:paste={handlePaste}
            />
            <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">%</span>
            {#if hasPlatformFee()}
              <button
                type="button"
                aria-label="Why is Embedded Item Fee unavailable?"
                aria-expanded={isEmbeddedItemFeeTooltipVisible}
                aria-describedby={isEmbeddedItemFeeTooltipVisible ? 'embedded-item-fee-tooltip' : undefined}
                data-testid="embedded-item-fee-disabled-trigger"
                on:mouseenter={openEmbeddedItemFeeTooltip}
                on:mouseleave={closeEmbeddedItemFeeTooltipOnLeave}
                on:focus={openEmbeddedItemFeeTooltip}
                on:blur={() => (isEmbeddedItemFeeTooltipVisible = false)}
                on:click={openEmbeddedItemFeeTooltip}
                on:keydown={(event) => event.key === 'Escape' && (isEmbeddedItemFeeTooltipVisible = false)}
                class="absolute inset-0 z-10 cursor-not-allowed rounded-xl bg-transparent"
              ></button>
              {#if isEmbeddedItemFeeTooltipVisible}
                <span id="embedded-item-fee-tooltip" role="tooltip" class="absolute left-0 top-full z-20 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg" on:mouseleave={closeEmbeddedItemFeeTooltipOnLeave}>
                  Clear the Platform Fee to use Embedded Item Fee.
                </span>
              {/if}
            {/if}
          </div>
          <p class="text-xs text-slate-500">Added to each item price.</p>
          <div class="relative mt-4">
            <button type="button" bind:this={embeddedFeesTrigger} aria-expanded={showEmbeddedFeesPopover} aria-controls="embedded-fees-popover" data-testid="add-embedded-fee" on:click={() => (showEmbeddedFeesPopover = !showEmbeddedFeesPopover)} class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400">
              <span class="text-base leading-none">+</span> Add Embedded Fee
            </button>
            {#if showEmbeddedFeesPopover}
              <div id="embedded-fees-popover" data-testid="embedded-fees-popover" bind:this={embeddedFeesPopover} class="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_28px_-14px_rgba(15,23,42,0.45)]">
                <div class="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">
                  <span>Embedded Fees</span>
                  <button type="button" aria-label="Close Embedded Fees" on:click={() => (showEmbeddedFeesPopover = false)} class="text-base font-normal text-slate-500 hover:text-slate-900">×</button>
                </div>
                <div class="space-y-3">
                  <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
                    <span class="text-sm font-medium text-slate-700">Table</span>
                    <div class="relative">
                      <input type="text" inputmode="decimal" autocomplete="off" placeholder="1.00" aria-label="Table Embedded Fee" aria-invalid={validationErrors.tableEmbeddedFeeRate ? 'true' : 'false'} data-testid="table-embedded-fee" value={tableEmbeddedFeeRate} on:input={(event) => handleInput('tableEmbeddedFeeRate', event.currentTarget.value)} on:keydown={allowInputKey} on:paste={handlePaste} class="w-full rounded-lg border px-3 py-2 pr-9 text-base font-medium text-slate-900 outline-none focus:border-slate-400 {validationErrors.tableEmbeddedFeeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}" />
                      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500">%</span>
                    </div>
                  </div>
                  {#if validationErrors.tableEmbeddedFeeRate}<p class="-mt-2 text-xs text-rose-600">{validationErrors.tableEmbeddedFeeRate}</p>{/if}
                  <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
                    <span class="text-sm font-medium text-slate-700">Shop</span>
                    <div class="relative">
                      <input type="text" inputmode="decimal" autocomplete="off" placeholder="1.00" aria-label="Shop Embedded Fee" aria-invalid={validationErrors.shopEmbeddedFeeRate ? 'true' : 'false'} data-testid="shop-embedded-fee" value={shopEmbeddedFeeRate} on:input={(event) => handleInput('shopEmbeddedFeeRate', event.currentTarget.value)} on:keydown={allowInputKey} on:paste={handlePaste} class="w-full rounded-lg border px-3 py-2 pr-9 text-base font-medium text-slate-900 outline-none focus:border-slate-400 {validationErrors.shopEmbeddedFeeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}" />
                      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500">%</span>
                    </div>
                  </div>
                  {#if validationErrors.shopEmbeddedFeeRate}<p class="-mt-2 text-xs text-rose-600">{validationErrors.shopEmbeddedFeeRate}</p>{/if}
                </div>
              </div>
            {/if}
          </div>
          {#if validationErrors.surchargeRate}
            <p class="text-sm text-rose-600">{validationErrors.surchargeRate}</p>
          {/if}
        </label>

        <label class="min-w-0 space-y-3">
          <span class="block text-sm font-semibold text-slate-800">Current Platform Fee</span>
          <div class="relative" bind:this={platformFeeField}>
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              placeholder="0.1"
              aria-label="Current Platform Fee"
              aria-invalid={validationErrors.currentServiceFeeRate ? 'true' : 'false'}
              data-testid="current-service-fee"
              disabled={hasEmbeddedItemFee()}
              value={currentServiceFeeRate}
              on:input={(event) => handleInput('currentServiceFeeRate', event.currentTarget.value)}
              on:keydown={allowInputKey}
              on:paste={handlePaste}
              class="w-full rounded-xl border px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-75 {validationErrors.currentServiceFeeRate ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}"
            />
            {#if hasEmbeddedItemFee()}
              <button
                type="button"
                aria-label="Why is Platform Fee unavailable?"
                aria-expanded={isPlatformFeeTooltipVisible}
                aria-describedby={isPlatformFeeTooltipVisible ? 'platform-fee-tooltip' : undefined}
                data-testid="platform-fee-disabled-trigger"
                on:mouseenter={openPlatformFeeTooltip}
                on:mouseleave={closePlatformFeeTooltipOnLeave}
                on:focus={openPlatformFeeTooltip}
                on:blur={() => (isPlatformFeeTooltipVisible = false)}
                on:click={openPlatformFeeTooltip}
                on:keydown={(event) => event.key === 'Escape' && (isPlatformFeeTooltipVisible = false)}
                class="absolute inset-0 z-10 cursor-not-allowed rounded-xl bg-transparent"
              ></button>
              {#if isPlatformFeeTooltipVisible}
                <span id="platform-fee-tooltip" role="tooltip" class="absolute left-0 top-full z-20 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg" on:mouseleave={closePlatformFeeTooltipOnLeave}>
                  Clear the Embedded Item Fee to use Platform Fee.
                </span>
              {/if}
            {/if}
          </div>
          <p class="text-xs text-slate-500">Additional fee applied per transaction.</p>
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
          disabled={!canCalculate()}
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
            {@const shopRateValue = parseOptionalAmount(shopEmbeddedFeeRate)}
            {@const tableRateValue = parseOptionalAmount(tableEmbeddedFeeRate)}
            {@const serviceFeeInput = parseOptionalAmount(currentServiceFeeRate)}
            {@const surchargeDecimal = formatDecimalMultiplier(surchargeRateValue)}
            {@const shopDecimal = formatDecimalMultiplier(shopRateValue)}
            {@const tableDecimal = formatDecimalMultiplier(tableRateValue)}

            <div class="grid min-w-0 grid-cols-1 gap-6 pt-5 md:grid-cols-2 lg:grid-cols-3">
              <div class="flex min-w-0 flex-col">
                <h3 class="text-xs font-semibold leading-4 text-slate-600">Embedded Item Fee</h3>
                {#each calculatedItems as item}
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">{formatTwoDecimals(item.original)} × {surchargeDecimal} = {formatTwoDecimals(item.surcharge)}</p>
                {/each}
              </div>

              {#if hasShopEmbeddedFee() && shopResults}
                <div class="flex min-w-0 flex-col">
                  <h3 class="text-xs font-semibold leading-4 text-slate-600">Shop Embedded Fee</h3>
                  {#each shopResults.items as item}
                    <p class="break-words font-mono text-sm leading-6 text-slate-800">{formatTwoDecimals(item.original)} × {shopDecimal} = {formatTwoDecimals(item.embeddedFee)}</p>
                  {/each}
                </div>
              {/if}

              {#if hasTableEmbeddedFee() && tableResults}
                <div class="flex min-w-0 flex-col">
                  <h3 class="text-xs font-semibold leading-4 text-slate-600">Table Embedded Fee</h3>
                  {#each tableResults.items as item}
                    <p class="break-words font-mono text-sm leading-6 text-slate-800">{formatTwoDecimals(item.original)} × {tableDecimal} = {formatTwoDecimals(item.embeddedFee)}</p>
                  {/each}
                </div>
              {/if}

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">Expected OO Item Price</h3>
                {#each calculatedItems as item}
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">{formatTwoDecimals(item.original)} + {formatTwoDecimals(item.surcharge)} = {formatTwoDecimals(item.ooPrice)}</p>
                {/each}
              </div>

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">Current Platform Fee</h3>
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
                <h3 class="text-xs font-semibold text-slate-600">Platform Fee</h3>
                <p class="break-words font-mono text-sm leading-6 text-slate-800">
                  {displayValue(currentServiceFeeAmount)} + {displayValue(surchargeAmount)} = {displayValue(expectedDposServiceFee)}
                </p>
              </div>

              <div class="min-w-0 space-y-1">
                <h3 class="text-xs font-semibold text-slate-600">Total</h3>
                  <p class="break-words font-mono text-sm leading-6 text-slate-800">
                    {formatTwoDecimals(calculatedItems.reduce((total, item) => total + item.original, 0))} + {displayValue(expectedDposServiceFee)} = {displayValue(expectedDposTotal)}
                  </p>
              </div>
            </div>
            <div class="mt-6 border-t border-slate-200 pt-4">
              <h3 class="text-xs font-semibold text-slate-600">DPOS Calculation</h3>
              <p class="mt-1 text-sm text-slate-500">The original item price is preserved, while the embedded item fee is added to the Platform Fee.</p>
            </div>
          {:else}
            <p class="pt-5 text-sm text-slate-500">Enter values and click Calculate to view the breakdown.</p>
          {/if}
        </div>
      {/if}
    </section>

    {#snippet feeFlowCards(flowKey: 'shop' | 'table', flowName: string, feeName: string, feeRate: string, results: FeeFlowResult | null)}
      {@const feeItems = results?.items ?? []}
      <section aria-label={`${flowName} Embedded Fee Results`}>
        <h2 class="mb-3 flex items-baseline gap-2 text-sm font-semibold text-slate-700">{flowName} Embedded Fee <span aria-hidden="true" class="font-normal text-slate-400">&middot;</span><span class="font-medium text-slate-500" data-testid={`${flowKey}-embedded-fee-rate`}>{parseOptionalAmount(feeRate)}%</span></h2>
        <div class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)] sm:p-5">
            <div class="mb-4 flex items-center justify-between gap-4 sm:mb-6">
              <h2 class="text-xl font-semibold text-slate-950">Online Ordering</h2>
            </div>
            <div class="space-y-3">
              <div class="grid grid-cols-3 gap-5 px-1 text-xs font-semibold uppercase leading-4 tracking-wide text-slate-500">
                <span class="text-center">Original</span><span class="text-center">OO Price</span><span class="text-center">{feeName}</span>
              </div>
              <div class="min-h-10 space-y-2">
                {#each feeItems as item, index}
                  <div class="grid grid-cols-3 items-center gap-5 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[15px] text-slate-900">
                    <span class="text-center" data-testid={`${flowKey}-oo-original-price-${index + 1}`}>{formatTwoDecimals(item.original)}</span>
                    <span class="text-center font-semibold" data-testid={`${flowKey}-oo-item-price-${index + 1}`}>{formatTwoDecimals(item.ooPrice)}</span>
                    <span class="text-center" data-testid={`${flowKey}-oo-fee-amount-${index + 1}`}>{formatTwoDecimals(item.embeddedFee)}</span>
                  </div>
                {/each}
              </div>
              <p class="text-sm text-slate-500">The {flowName.toLowerCase()} embedded fee is included in the displayed item price.</p>
            </div>
          </section>

          <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]">
            <div class="mb-6"><h2 class="text-xl font-semibold text-slate-950">Cart</h2></div>
            <div class="space-y-3">
              <div class="space-y-2">
                <p class="px-1 text-xs font-medium text-slate-600">Item Price</p>
                {#each feeItems as item, index}
                  <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
                    <span class="text-sm font-medium text-slate-600">Item {index + 1}</span>
                    <span class="text-right text-[15px] font-medium text-slate-950" data-testid={`${flowKey}-cart-item-price-${index + 1}`}>{formatTwoDecimals(item.ooPrice)}</span>
                  </div>
                {/each}
              </div>
              {#if results?.currentServiceFeeAmount}
                <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
                  <span class="text-sm font-medium text-slate-600">Current Platform Fee</span>
                  <span class="text-right text-[15px] font-medium text-slate-950">{formatTwoDecimals(results.currentServiceFeeAmount)}</span>
                </div>
              {/if}
              <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
                <span class="text-sm font-semibold text-slate-900">Expected Cart Total</span>
                <span class="text-right text-lg font-semibold text-slate-950" data-testid={`${flowKey}-cart-total`}>{results ? formatTwoDecimals(results.cartTotal) : ''}</span>
              </div>
            </div>
          </section>

          <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)] md:col-span-2 lg:col-span-1">
            <div class="mb-6"><h2 class="text-xl font-semibold text-slate-950">DPOS Order Summary</h2></div>
            <div class="space-y-3">
              <div class="space-y-2">
                <p class="px-1 text-xs font-medium text-slate-600">Original Item Price</p>
                {#each feeItems as item, index}
                  <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
                    <span class="text-sm font-medium text-slate-600">Item {index + 1}</span>
                    <span class="text-right text-[15px] font-medium text-slate-950" data-testid={`${flowKey}-dpos-original-price-${index + 1}`}>{formatTwoDecimals(item.original)}</span>
                  </div>
                {/each}
              </div>
              <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
                <span class="text-sm font-semibold text-slate-900">Platform Fee</span>
                <span class="text-right text-lg font-semibold text-slate-950" data-testid={`${flowKey}-dpos-service-fee`}>{results ? formatTwoDecimals(results.expectedDposServiceFee) : ''}</span>
              </div>
              <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
                <span class="text-sm font-semibold text-slate-900">Total</span>
                <span class="text-right text-lg font-semibold text-slate-950" data-testid={`${flowKey}-dpos-total`}>{results ? formatTwoDecimals(results.expectedDposTotal) : ''}</span>
              </div>
            </div>
          </section>
        </div>
      </section>
    {/snippet}

    {#snippet comparisonFlowCards(flowKey: 'item' | 'table' | 'shop', flowName: string, feeName: string, feeRate: string, results: FeeFlowResult | null)}
      {@const flowItems = results?.items ?? []}
      <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]" aria-label={`${flowName} comparison`}>
        <div class="border-b border-slate-200 pb-3">
          <h2 class="text-lg font-semibold text-slate-950">{flowName}</h2>
          <p class="mt-1 text-xs font-medium text-slate-500">{feeName} · {parseOptionalAmount(feeRate)}%</p>
        </div>

        <div class="space-y-4 pt-4">
          <section>
            <h3 class="mb-2 text-sm font-semibold text-slate-800">Online Ordering</h3>
            <div class="grid grid-cols-3 gap-2 px-2 text-[11px] font-semibold uppercase text-slate-500">
              <span>Original</span><span class="text-center">OO Price</span><span class="text-right">Fee</span>
            </div>
            <div class="mt-1 space-y-1">
              {#each flowItems as item, index}
                <div class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-2 py-2 font-mono text-xs text-slate-800">
                  <span data-testid={`comparison-${flowKey}-original-${index + 1}`}>{formatTwoDecimals(item.original)}</span>
                  <span class="text-center font-semibold" data-testid={`comparison-${flowKey}-oo-price-${index + 1}`}>{formatTwoDecimals(item.ooPrice)}</span>
                  <span class="text-right" data-testid={`comparison-${flowKey}-fee-${index + 1}`}>{formatTwoDecimals(item.embeddedFee)}</span>
                </div>
              {/each}
            </div>
          </section>

          <section class="border-t border-slate-200 pt-3">
            <h3 class="mb-2 text-sm font-semibold text-slate-800">Cart</h3>
            <div class="space-y-1">
              {#each flowItems as item, index}
                <div class="flex justify-between gap-3 rounded-lg bg-slate-50 px-2 py-2 text-xs">
                  <span class="text-slate-600">Item {index + 1}</span>
                  <span class="font-medium text-slate-900" data-testid={`comparison-${flowKey}-cart-item-${index + 1}`}>{formatTwoDecimals(item.ooPrice)}</span>
                </div>
              {/each}
              {#if results?.currentServiceFeeAmount}
                <div class="flex justify-between gap-3 px-2 py-1 text-xs">
                  <span class="text-slate-600">Current Platform Fee</span>
                  <span class="font-medium text-slate-900">{formatTwoDecimals(results.currentServiceFeeAmount)}</span>
                </div>
              {/if}
              <div class="flex justify-between gap-3 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold">
                <span>Expected Cart Total</span>
                <span data-testid={`comparison-${flowKey}-cart-total`}>{results ? formatTwoDecimals(results.cartTotal) : ''}</span>
              </div>
            </div>
          </section>

          <section class="border-t border-slate-200 pt-3">
            <h3 class="mb-2 text-sm font-semibold text-slate-800">DPOS Order Summary</h3>
            <div class="space-y-1">
              {#each flowItems as item, index}
                <div class="flex justify-between gap-3 rounded-lg bg-slate-50 px-2 py-2 text-xs">
                  <span class="text-slate-600">Original Item {index + 1}</span>
                  <span class="font-medium text-slate-900">{formatTwoDecimals(item.original)}</span>
                </div>
              {/each}
              <div class="flex justify-between gap-3 px-2 py-1 text-xs">
                <span class="text-slate-600">Platform Fee</span>
                <span class="font-medium text-slate-900" data-testid={`comparison-${flowKey}-platform-fee`}>{results ? formatTwoDecimals(results.expectedDposServiceFee) : ''}</span>
              </div>
              <div class="flex justify-between gap-3 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold">
                <span>Total</span>
                <span data-testid={`comparison-${flowKey}-dpos-total`}>{results ? formatTwoDecimals(results.expectedDposTotal) : ''}</span>
              </div>
            </div>
          </section>
        </div>
      </section>
    {/snippet}

    {#if hasShopEmbeddedFee() || hasTableEmbeddedFee()}
      <div class="mb-4 flex justify-end">
        <div class="group relative">
          <button
            type="button"
            data-testid="results-view-toggle"
            aria-label={showComparisonView ? 'Comparison view' : 'Documentation view'}
            aria-describedby="results-view-tooltip"
            aria-pressed={showComparisonView}
            title={showComparisonView ? 'Comparison view' : 'Documentation view'}
            on:click={() => (showComparisonView = !showComparisonView)}
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <ObjectsColumnSolid aria-hidden="true" class="h-4 w-4" />
          </button>
          <span id="results-view-tooltip" role="tooltip" class="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-max rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            {showComparisonView ? 'Comparison view' : 'Documentation view'}
          </span>
        </div>
      </div>
    {/if}

    {#if showComparisonView}
      {@const itemComparisonResults = getItemComparisonResults()}
      <div class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="results-comparison-view">
        {@render comparisonFlowCards('item', 'Online Ordering', 'Embedded Item Fee', surchargeRate, itemComparisonResults)}
        {#if hasTableEmbeddedFee()}
          {@render comparisonFlowCards('table', 'Table', 'Table Embedded Fee', tableEmbeddedFeeRate, tableResults)}
        {/if}
        {#if hasShopEmbeddedFee()}
          {@render comparisonFlowCards('shop', 'Shop', 'Shop Embedded Fee', shopEmbeddedFeeRate, shopResults)}
        {/if}
      </div>
    {:else}
    {#if hasShopEmbeddedFee() || hasTableEmbeddedFee()}
      <h2 class="flex items-baseline gap-2 text-sm font-semibold text-slate-700">Item Embedded Fee {#if hasEmbeddedItemFee()}<span aria-hidden="true" class="font-normal text-slate-400">&middot;</span><span class="font-medium text-slate-500" data-testid="item-embedded-fee-rate">{parseOptionalAmount(surchargeRate)}%</span>{/if}</h2>
    {/if}

    <div class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)] sm:p-5">
        <div class="mb-4 flex items-center justify-between gap-4 sm:mb-6">
          <div>
            <h2 class="text-xl font-semibold text-slate-950">Online Ordering</h2>
          </div>

        </div>

      <div class="space-y-3">
        <div class="grid grid-cols-3 gap-5 px-1 text-xs font-semibold uppercase leading-4 tracking-wide text-slate-500">
          <span class="text-center">Original</span><span class="text-center">OO Price</span><span class="text-center">Embedded Item Fee</span>
        </div>
        <div class="min-h-10 space-y-2">
          {#each calculatedItems as item, index}
            <div class="grid grid-cols-3 items-center gap-5 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[15px] text-slate-900">
              <span class="text-center" data-testid={index === 0 ? 'oo-original-price' : `oo-original-price-${index + 1}`}>{formatTwoDecimals(item.original)}</span>
              <span class="text-center font-semibold" data-testid={index === 0 ? 'oo-item-price' : `oo-item-price-${index + 1}`}>{formatTwoDecimals(item.ooPrice)}</span>
              <span class="text-center" data-testid={index === 0 ? 'oo-surcharge-amount' : `oo-surcharge-amount-${index + 1}`}>{formatTwoDecimals(item.surcharge)}</span>
            </div>
          {/each}
        </div>
        <span class="sr-only" data-testid="oo-surcharge">{hasCalculated ? `${formatTwoDecimals(parseAmount(surchargeRate))}%` : ''}</span>

 <p class="text-sm text-slate-500">The embedded item fee is included in the displayed item price.</p>
      </div>
    </section>

      <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)] sm:p-5">
        <div class="mb-4 flex items-center justify-between gap-4 sm:mb-6">
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
          {/each}
        </div>

        {#if currentServiceFeeAmount !== null && currentServiceFeeAmount > 0}
          <div class="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
            <span class="text-sm font-medium text-slate-600">Current Platform Fee</span>
            <span class="text-right text-[15px] font-medium text-slate-950" data-testid="cart-service-fee">{displayValue(currentServiceFeeAmount)}</span>
          </div>
        {/if}

        <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-semibold text-slate-900">Expected Cart Total</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="cart-total">{hasCalculated ? displayValue(cartTotal) : ''}</span>
        </div>
      </div>
    </section>

      <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)] md:col-span-2 lg:col-span-1 sm:p-5">
        <div class="mb-4 flex items-center justify-between gap-4 sm:mb-6">
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
          {/each}
        </div>

        <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-semibold text-slate-900">Platform Fee</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="dpos-service-fee">{hasCalculated ? displayValue(expectedDposServiceFee) : ''}</span>
        </div>

        <div class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
          <span class="text-sm font-semibold text-slate-900">Total</span>
          <span class="text-right text-lg font-semibold text-slate-950" data-testid="dpos-total">{hasCalculated ? displayValue(expectedDposTotal) : ''}</span>
        </div>
      </div>
    </section>
    </div>

    {#if hasTableEmbeddedFee()}
      {@render feeFlowCards('table', 'Table', 'Table Embedded Fee', tableEmbeddedFeeRate, tableResults)}
    {/if}

    {#if hasShopEmbeddedFee()}
      {@render feeFlowCards('shop', 'Shop', 'Shop Embedded Fee', shopEmbeddedFeeRate, shopResults)}
    {/if}
    {/if}

    
  </div>
</main>

<style global>
  @import "tailwindcss";
</style>
