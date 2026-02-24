# CTO/CISO Code Review — Cleanup Report

**Project:** EFVM Pátio 360 — Passagem de Serviço Ferroviário
**Client:** Vale S.A. (NYSE-listed)
**Date:** 2026-02-23
**Reviewer:** Automated CTO/CISO Sprint

---

## Metrics Before/After

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| `as any` assertions (src/) | 11 | 1 | **-10** |
| Unguarded console statements | 7 | 2* | **-5** |
| Unused dependencies | 1 (`echarts-for-react`) | 0 | **-1** |
| Security review comments added | 0 | 3 | **+3** |
| Tests passing | 277 | 277 | **0 (no regressions)** |
| Build status | OK | OK | ✅ |
| Known vulnerabilities (devDeps) | 4 | 4 | 0 (see notes) |

\* 2 remaining `console.error` are in React ErrorBoundary `componentDidCatch` — standard React practice, required for dev tooling.

---

## Changes Made

### 2.1 Dead Code Elimination
- **Removed `echarts-for-react`** from `package.json` — zero imports found in codebase
- `_deprecated/` directory: 5 quarantined files confirmed with no active imports (pre-existing)
- No TODO/FIXME/HACK comments found requiring conversion

### 2.2 Dependency Audit
- Removed `echarts-for-react` (unused wrapper; `echarts` itself is still used directly)
- `pnpm install` clean after removal
- **`pnpm audit` results:** 4 vulnerabilities, all in **devDependencies** only:
  - 3x HIGH: `minimatch` ReDoS via `eslint`, `@typescript-eslint`, `@vitest/coverage-v8` → transitive, no runtime impact
  - 1x MODERATE: `esbuild` dev server CORS → `vite` transitive, dev-only
  - **Recommendation:** Upgrade `eslint` to v9+ and `vite` to v6+ in next sprint

### 2.3 Type Safety Hardening
- **EventProjector.ts (7 → 0 `as any`):** Created 5 projection-specific payload interfaces (`ProjectionServicePassCreatedPayload`, `ProjectionWeighingCompletedPayload`, `ProjectionAlertGeneratedPayload`, `ProjectionInspectionCompletedPayload`, `ProjectionAnomalyRegisteredPayload`). Also typed `eventStore` parameter from `any` to `IndexedDBEventStore`.
- **ServicePassUseCases.ts (2 → 0 `as any`):** Replaced with `Record<string, unknown>` for payload field access
- **passagem/index.tsx (1 → 0 `as any`):** Replaced `{} as any` with `Partial<SegurancaManobras>` with proper import
- **BoaJornadaInspection.tsx (1 → 0 `as any`):** Replaced with `keyof BoaJornadaHeader` typed index access
- **ServicePassEvents.ts:** Added `EventPayloadMap` type map and `TypedPayload<T>` helper for future type-safe event access
- **Remaining:** 1 `as any` in `IndexedDBEventStore.ts:218` (IDBRequest result typing — requires IndexedDB generic refactor, deferred)

### 2.4 Console Cleanup
- **SyncEngine.ts:** `console.error` → `secureLog.error`
- **seedCredentials.ts:** `console.error` → `secureLog.error`
- **azureAuth.ts:** `console.error` → `secureLog.error`
- **usePassagemSync.ts:** `console.warn` → `secureLog.warn`
- **Kept (intentional):**
  - `ErrorBoundary.tsx` and `ModuleErrorBoundary.tsx` — React `componentDidCatch` requires console output for dev tooling
  - `configuracoes/index.tsx` — already gated by `import.meta.env?.DEV`
  - `security.ts` — this IS the `secureLog` implementation

### 2.5 Security Hardening
- **Hardcoded password:** Added `REVIEW [SECURITY]` comment to `DEFAULT_PASSWORD` in `seedCredentials.ts` noting it must be replaced with Azure AD SSO for production
- **localStorage plaintext:** Added `REVIEW [SECURITY]` comment to `useAuth.ts` documenting the architectural limitation and recommending server-side sessions with Azure AD SSO
- **No other security issues found:** No `innerHTML`, `eval`, `dangerouslySetInnerHTML`, CORS `*`, JWT logging, or exposed API keys

### 2.6 Performance (assessment only — no changes)
- React.memo, useMemo, useCallback usage verified correct across components
- 4 routes already use React.lazy + Suspense in App.tsx
- No changes needed — existing patterns are sound

### 2.7 Code Deduplication (flagged — no changes)
- See "Remaining Technical Debt" below

### 2.8 File Organization (flagged — no changes)
- See "Remaining Technical Debt" below

### Phase 3: Cross-Platform
- Already completed in prior task: `rimraf` installed, `clean`/`fresh` scripts updated

---

## Breaking Changes

**None.** All changes are internal type safety, logging, and dependency cleanup. No public API, UI behavior, or business logic was modified.

---

## Remaining Technical Debt

| Item | Severity | Effort | Rationale for Deferral |
|------|----------|--------|----------------------|
| 3 duplicate sync engines (`services/syncEngine.ts`, `infrastructure/persistence/SyncEngine.ts`, `services/offlineSync.ts`) | HIGH | 3-5 days | Requires careful business logic migration and regression testing |
| `passagem/index.tsx` at 2832 lines | HIGH | 5-8 days | Largest file; decomposition requires UI/UX review and component extraction |
| `DashboardBI.tsx` at 1883 lines | MEDIUM | 3-5 days | Heavy component; needs chart extraction into sub-components |
| `AdamBootChat.tsx` at 1378 lines | MEDIUM | 2-3 days | Chatbot component; can extract message handlers and UI |
| 132 duplicate `JSON.parse(localStorage.getItem(...))` patterns | MEDIUM | 2-3 days | Should extract into `StorageService` utility with typed getters |
| 15+ inline style objects in JSX | LOW | 2-3 days | Extract to `styles` objects or CSS modules |
| Pre-existing TypeScript errors (~40 in `validacao.ts`, `featureFlags.ts`, etc.) | MEDIUM | 2-3 days | Mostly `import.meta.env` typing and `SegurancaManobras` field mismatches |
| 1 remaining `as any` in `IndexedDBEventStore.ts` | LOW | 30 min | IDB result typing |
| 4 devDependency vulnerabilities | LOW | 1 day | Requires major version bumps of eslint/vite |

---

## Recommended Next Steps (Priority Order)

1. **Upgrade eslint v9 + vite v6** — Resolves all 4 audit vulnerabilities and brings modern tooling
2. **Unify sync engines** — Consolidate 3 implementations into single `SyncEngine` in `infrastructure/persistence/` to eliminate behavior divergence risk
3. **Fix pre-existing TypeScript errors** — Address `validacao.ts` type mismatches (`linhaLimpa` → `linhaLivre`, `ItemSeguranca` vs `boolean` comparisons) and add Vite `ImportMeta` env typings
4. **Extract `StorageService`** — Replace 132 raw `JSON.parse(localStorage.getItem(...))` patterns with typed, error-handled utility
5. **Decompose `passagem/index.tsx`** — Split into `PassagemHeader`, `PassagemSections`, `PassagemActions`, `PassagemReview` sub-components (separate epic)

---

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm install` | ✅ Clean (echarts-for-react removed) |
| `pnpm exec tsc --noEmit` | ⚠️ Pre-existing errors only (none introduced) |
| `pnpm test` | ✅ 277/277 passing |
| `pnpm exec vite build` | ✅ Built in ~14s |
| `pnpm audit` | ⚠️ 4 vulnerabilities (all devDependencies) |

---

## Files Modified

| File | Changes |
|------|---------|
| `package.json` | Removed `echarts-for-react` dependency |
| `src/domain/events/ServicePassEvents.ts` | Added `EventPayloadMap` + `TypedPayload<T>` |
| `src/infrastructure/cqrs/EventProjector.ts` | 5 projection payload interfaces, 7 `as any` → typed, `eventStore: any` → typed |
| `src/application/use-cases/ServicePassUseCases.ts` | 2 `as any` → `Record<string, unknown>` |
| `src/pages/passagem/index.tsx` | 1 `as any` → `Partial<SegurancaManobras>`, added import |
| `src/components/operacional/BoaJornadaInspection.tsx` | 1 `as any` → `keyof BoaJornadaHeader` |
| `src/infrastructure/persistence/SyncEngine.ts` | Added `secureLog` import, guarded `console.error` |
| `src/services/seedCredentials.ts` | Added `secureLog` import, guarded `console.error`, added security review comment |
| `src/services/azure/azureAuth.ts` | Added `secureLog` import, guarded `console.error` |
| `src/hooks/usePassagemSync.ts` | Added `secureLog` import, guarded `console.warn` |
| `src/hooks/useAuth.ts` | Added `REVIEW [SECURITY]` comment block |
