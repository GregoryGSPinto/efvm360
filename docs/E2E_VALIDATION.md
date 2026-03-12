# E2E Validation Notes

## Current Evidence

- Playwright configuration: `e2e/playwright.config.ts`
- Specs: `e2e/specs/`
- Auth fixtures and setup helpers: `e2e/.auth/`, `e2e/global-setup.ts`

## Current Limitation

The repository contains Playwright assets, but an evaluator should treat E2E status as environment-dependent until the frontend and backend are started together.
