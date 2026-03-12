# Frontend Package

Canonical repository documentation lives in the root [README](../README.md).

## Package Purpose

This package contains the React/Vite frontend for the EFVM360 case study. It can run in local/demo mode without the backend, or in partial online mode when `VITE_API_URL` is configured.

## Commands

```bash
pnpm --filter @efvm360/frontend dev
pnpm --filter @efvm360/frontend lint
pnpm --filter @efvm360/frontend typecheck
pnpm --filter @efvm360/frontend test
pnpm --filter @efvm360/frontend build
```
