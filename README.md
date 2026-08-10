# Surcharge Tool — Easy Overview

This small SvelteKit project provides a simple business surcharge calculator UI with end-to-end Playwright tests. The README below explains the purpose of the project, how to run it, and a short, human-friendly description of the important files and folders so you can quickly find what you need.

## Quick start

- Install: `npm install`
- Build: `npm run build`
- Preview (local): `npm run preview -- --port 4173`
- Run Playwright tests: `npx playwright test` or `npx playwright test tests/surcharge.spec.ts`

## What this project does

- Lets a user enter an original price and a surcharge percentage, then shows the surcharge amount and final price.
- Contains business logic separated from UI so behavior is easy to test.

## Short file descriptions (human-friendly)

- **package.json**: Project metadata and scripts (install, build, preview, tests).
- **README.md**: (this file) Quick project overview, run commands and file descriptions.

- **surcharge_tool_v1/package.json**: The SvelteKit app's package file with local scripts and dependencies.
- **surcharge_tool_v1/vite.config.ts**: Vite configuration used for building and previewing the SvelteKit app.
- **surcharge_tool_v1/playwright.config.ts**: Playwright configuration that starts the preview server and sets test options.
- **surcharge_tool_v1/tsconfig.json**: TypeScript compiler settings for the app.

- **surcharge_tool_v1/src/app.html**: Base HTML template used by SvelteKit for the client page shell.
- **surcharge_tool_v1/src/app.d.ts**: Small TypeScript ambient types used in the Svelte app.

- **surcharge_tool_v1/src/lib/**: Reusable code used across the app.
  - **index.ts**: Library entry (exports). Use this to access shared utilities.
  - **assets/**: Static assets used by the UI (images, icons).
  - **vitest-examples/**: Example unit tests and components used for local testing (not the Playwright tests).

- **surcharge_tool_v1/src/lib/calculations.ts**: Pure business logic — functions that calculate the surcharge amount and final price. These functions are written to be deterministic and easy to unit test.

- **surcharge_tool_v1/src/routes/+page.svelte**: The main UI page with the surcharge form, validation, and result display. This is where inputs are normalized and the calculate button triggers the library functions.
- **surcharge_tool_v1/src/routes/+layout.svelte**: The app layout used across pages (basic shell and styles).
- **surcharge_tool_v1/src/routes/layout.css**: Small CSS file with layout styles.

- **surcharge_tool_v1/src/routes/demo/**: Demo route and Playwright-friendly pages used by tests.
  - **+page.svelte**: Demo content for manual exploration.
  - **playwright/page.svelte.e2e.ts**: Example e2e helper used during test development.

- **static/robots.txt**: Static file served as-is by the preview server.

- **tests/surcharge.spec.ts**: End-to-end Playwright tests that exercise the surcharge form. These tests verify valid inputs, decimals, zero values, invalid input behavior, and negative-value validation.

## Notes & tips

- The UI keeps form fields as strings and parses them intentionally to avoid runtime `.trim()` errors when Svelte binds non-string values.
- If preview fails due to a port conflict, kill existing Node processes that are using the port and retry `npm run preview -- --port 4173`.

---

If you'd like, I can expand this README with:
- A line-by-line explanation of `surcharge_tool_v1/src/routes/+page.svelte` (validation and normalization).
- A full list of every file in the repo (longer, exhaustive catalog).

Tell me which you prefer and I’ll update the README accordingly.
# surcharge-tool
A simple QA tool for calculating and validating item surcharges.
