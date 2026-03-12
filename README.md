# EFVM360

Independent portfolio case study for digital shift handover and yard operations. The repository contains a React/Vite frontend, an Express/Sequelize backend, Playwright end-to-end tests, and supporting docs for audit, demo, and deployment review. It is not an official system, not a production service, and not affiliated with any railway operator.

## Executive Summary

EFVM360 addresses a real operational problem: shift handover data is often fragmented, delayed, or lost when teams rely on paper or disconnected spreadsheets. This repository demonstrates a technical approach for replacing that flow with a web application that can run in local/offline mode, optionally connect to an API, and expose enough engineering surface to evaluate architecture, testing, and release discipline.

## Why This Project Matters

- It shows a non-trivial frontend with domain-oriented modules, offline persistence, and role-aware workflows.
- It shows a backend with authentication, RBAC, validation, observability hooks, and an expanding route surface.
- It exposes the gap between architecture intent and current integration status instead of hiding it.

## Business Problem

Shift handover in industrial operations needs structured records, traceability, and predictable access to the latest operating context. The failure mode is usually not a missing dashboard; it is inconsistent operational context at the moment of a handoff.

## Solution Scope

Implemented in code today:
- Browser UI for login, registration, handover entry, DSS, dashboards, risk grades, inter-yard flow, approvals, settings, support, history, and admin/business views.
- Express API for auth, passagens, audit, patios, LGPD, workflows, analytics, inter-yard operations, compositions, equipment, risk grades, metrics, and webhooks.
- Offline-capable frontend state using local storage and IndexedDB-backed sync components.

Documented architecture intent:
- Full online/offline convergence between frontend CRUD flows and backend persistence.
- Azure-based production deployment with App Service, Static Web Apps, Key Vault, and optional Entra ID.

## Current Maturity Snapshot

- Package manager: `pnpm`
- Workspace packages: `frontend`, `backend`, `e2e`
- Local development: implemented
- CI workflow: implemented
- Frontend-only deploy config: implemented in `vercel.json`
- Azure deploy workflows: configured, not verified from this repository alone
- Frontend/backend feature parity: partial

## What Is Working Today

- Frontend can run locally in demo/offline mode without backend connectivity.
- Backend builds and exposes a broad `/api/v1` route surface with middleware, validators, and tests.
- Unit/integration test suites exist for frontend and backend, plus Playwright specs and k6 scenarios.
- Docker Compose files exist for local development and a backend-focused production-style stack.

## Current Implementation Status

- Frontend: substantial UI surface implemented.
- Backend: substantial API surface implemented.
- Frontend-to-backend integration: partial. Several frontend flows still use local persistence even when equivalent backend endpoints exist.
- Enterprise controls: partial. Security middleware and optional Azure integrations exist, but production readiness depends on environment-specific setup outside the repo.

## Architecture Overview

The repo is a `pnpm` workspace with three packages:

- `frontend`: React 18, TypeScript, Vite, Vitest, PWA plugin, local/offline persistence helpers.
- `backend`: Express, TypeScript, Sequelize, MySQL driver, Jest, Swagger setup, Socket.IO.
- `e2e`: Playwright specs targeting the frontend.

Supporting assets:

- `docs/`: audit, implementation, evidence, readiness, and setup references.
- `load-tests/`: k6 scenarios.
- `.github/workflows/`: CI, deployment, and security scan workflows.
- `docker-compose*.yml`: local and production-style container orchestration.

## Frontend

Implemented in code:
- Route constants and lazy-loaded page modules for login, cadastro, dashboard views, passagem, DSS, composicoes, inter-yard, approvals, profile, settings, support, landing, help, and admin/business.
- Domain-oriented code under `frontend/src/domain`, application use cases, and persistence/observability helpers.
- PWA build configuration through `vite-plugin-pwa` with a custom service worker source file.

Partial or conditional:
- Online mode depends on `VITE_API_URL`.
- Azure/Entra login code exists behind environment configuration and feature flags.
- Some "AI" and analytics UI components are present, but they are not evidence of a production AI service.

## Backend

Implemented in code:
- API routes under `backend/src/routes/index.ts`.
- Controllers, migrations, models, middleware, WebSocket initialization, Swagger setup, and seed scripts.
- JWT-based auth, RBAC middleware, request validation, telemetry hooks, and LGPD endpoints.

Partial or conditional:
- Real deployment depends on MySQL and secrets that are not available from the repository alone.
- Some routes are broader than the current frontend integration layer actually uses.

## Security

Implemented in code:
- JWT auth and refresh flow support.
- RBAC middleware and route-level authorization.
- `helmet`, CORS controls, rate limiting, request IDs, body sanitization, and validation middleware.
- Optional Azure Key Vault and Application Insights integration points.

Not claimed:
- No verified compliance certification.
- No evidence in this repo alone of live production hardening, managed secrets rotation, or audited uptime.

## Reliability / Offline / Performance

Implemented in code:
- IndexedDB/local storage persistence helpers.
- Custom service worker source and PWA configuration.
- WebSocket client/server code paths.
- k6 scenario files for load experiments.

Partial:
- The offline-to-server reconciliation story is not fully wired through all frontend CRUD modules.
- Performance budgets are not enforced uniformly outside CI.

## Testing Strategy

- Frontend: Vitest suites under `frontend/__tests__`.
- Backend: Jest suites under `backend/__tests__`.
- E2E: Playwright specs under `e2e/specs`.
- Load: k6 scenarios under `load-tests/scenarios`.

Current evidence is documented in [TECHNICAL_EVIDENCE.md](./docs/TECHNICAL_EVIDENCE.md) and [REPOSITORY_FACTS.md](./docs/REPOSITORY_FACTS.md).

## Technical Highlights Backed By Code

- Offline persistence helpers in `frontend/src/infrastructure/persistence` and `frontend/src/services`.
- Route and middleware surface in `backend/src/routes` and `backend/src/middleware`.
- Swagger bootstrap in `backend/src/config/swagger.ts`.
- WebSocket support in `backend/src/services/websocket.ts`.
- CI workflow and generated repository facts validation in `.github/workflows/ci.yml` and `scripts/repo-facts.mjs`.

## Developer Experience

Canonical commands:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
pnpm verify
```

## Deployment

Configured in repository:
- `vercel.json` for frontend static output.
- Azure GitHub Actions workflows for staging and production.
- Dockerfiles for frontend and backend.
- `docker-compose.yml` for local stack orchestration.

Important limitation:
- These deployment assets are configuration templates until the required secrets, cloud resources, and runtime infrastructure are provisioned externally.

## Documentation

- [Implementation status](./docs/IMPLEMENTATION_STATUS.md)
- [Technical evidence](./docs/TECHNICAL_EVIDENCE.md)
- [Enterprise readiness](./docs/ENTERPRISE_READINESS.md)
- [Demo script](./docs/DEMO_SCRIPT.md)
- [Truth matrix](./docs/TRUTH_MATRIX.md)
- [Repository facts](./docs/REPOSITORY_FACTS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Deployment guide](./DEPLOY.md)
- [Contribution guide](./CONTRIBUTING.md)

## Limitations and Known Gaps

- Frontend online mode is incomplete relative to backend capability.
- `pnpm lint` currently fails because the frontend has pre-existing ESLint violations in source and tests.
- `pnpm test` currently fails in the backend under this execution environment because several Jest/Supertest suites attempt to bind to `0.0.0.0`, which returns `EPERM` here.
- Several historical docs in the repository were written as planning or audit notes and have been reduced to non-canonical references to avoid unsupported claims.
- Azure-specific features are optional and not verifiable without external tenant and secret configuration.
- No live production environment is proven by the repository alone.

## Roadmap With Priority Order

1. Connect frontend CRUD flows to the existing backend where endpoints already exist.
2. Consolidate duplicate sync implementations into one documented path.
3. Expand automated validation to cover E2E startup orchestration and deployment smoke tests.
4. Reduce historical/deprecated documentation and keep generated facts as the numeric source of truth.
5. Add evidence for observability and release rollback in a real environment if this evolves beyond portfolio scope.

## Commercial & Legal Positioning

This repository is published as an independent technical case study. The code is MIT-licensed, but the repository does not represent a commercial service offering, customer deployment, support agreement, or institutional partnership.

## Disclaimer / Portfolio Positioning

Use this repository as engineering evidence, not as proof of a production rollout. Where the docs say "implemented", the feature exists in code. Where the docs say "partial", some code exists but the end-to-end workflow is incomplete. Where the docs say "roadmap" or "intent", it is architectural direction only.
