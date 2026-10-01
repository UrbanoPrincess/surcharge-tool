# Embedded Fee Calculator

The Embedded Fee Calculator validates how item, shop, and table embedded fees flow through Online Ordering, Cart, and DPOS totals. It is designed for quick QA and comparison of fee behavior using one or more items.

## Key features

- Calculate an independent Embedded Item Fee, Shop Embedded Fee, or Table Embedded Fee.
- Add Shop and Table fees through the **Add Embedded Fee** popover without replacing the item fee.
- Enter multiple item prices and calculate each item independently.
- Apply optional current platform fees and validate incompatible fee selections.
- Show calculation breakdowns with deterministic two-decimal, half-up rounding.
- Compare the resulting Online Ordering, Cart, and DPOS values for each fee flow.
- Switch between Shop and Table fee flows while retaining each flow's independent rate and results.
- Swap between **Documentation View**, the original result layout, and **Comparison View**, the newer side-by-side fee-flow layout.
- Reset inputs and results for repeatable test scenarios.

## Calculation logic

For each item, the calculator applies the selected fee independently:

1. Embedded fee amount = original item price × fee rate.
2. Online Ordering item price = original item price + embedded fee amount.
3. Cart total = Online Ordering item price + current platform fee, when present.
4. DPOS platform fee and total are calculated separately so the expected DPOS result can be compared with the Cart result.

All monetary results are rounded to two decimal places using half-up rounding. Shop and Table flows repeat the same calculation with their own fee rates and result sets.

## Views

- **Documentation View**: Presents the original Online Ordering, Cart, and DPOS result cards, followed by Shop and Table fee sections when enabled.
- **Comparison View**: Shows each enabled fee flow in a consistent comparison card with its inputs, fee amount, Cart result, and DPOS result.

## Tech stack

- SvelteKit and Svelte 5
- TypeScript
- Vite
- Tailwind CSS 4
- Flowbite Svelte and Flowbite Svelte Icons
- Vitest for unit tests
- Playwright for end-to-end tests

## Setup

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run check       # Svelte and TypeScript validation
npm run test:unit   # Unit tests
npm test            # Playwright end-to-end tests
npm run build       # Production build
npm run preview     # Preview the production build
```

The main calculator UI is in `src/routes/+page.svelte`, calculation helpers are in `src/lib/calculations.ts`, and end-to-end coverage is in `tests/surcharge.spec.ts`.
