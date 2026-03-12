# Technical Evidence

## Stack

- Frontend: React 18, TypeScript, Vite, Vitest, vite-plugin-pwa
- Backend: Express, TypeScript, Sequelize, MySQL driver, Socket.IO, Jest
- E2E: Playwright
- Load testing: k6 scenario files
- Package manager: pnpm workspace

## Tests Present In The Repository

- Frontend tests: `frontend/__tests__/`
- Backend tests: `backend/__tests__/`
- E2E specs: `e2e/specs/`
- Load scenarios: `load-tests/scenarios/`

Counts are maintained in [REPOSITORY_FACTS.md](./REPOSITORY_FACTS.md).

## Security Evidence

- JWT auth service: `backend/src/services/authService.ts`
- Auth middleware: `backend/src/middleware/auth.ts`
- Security middleware: `backend/src/middleware/security.ts`
- Request validation: `backend/src/middleware/validators/`
- Frontend security helpers: `frontend/src/services/security.ts`

## Deployment Evidence

- Frontend static deploy config: `vercel.json`
- Azure workflows: `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml`
- Dockerfiles: `frontend/Dockerfile`, `backend/Dockerfile`
- Compose files: `docker-compose.yml`, `docker-compose.prod.yml`

## Observability Evidence

- Telemetry middleware: `backend/src/middleware/telemetry.ts`
- Monitoring service: `backend/src/services/monitoringService.ts`
- Frontend observability utilities: `frontend/src/infrastructure/observability/`

## Offline / PWA Evidence

- PWA build config: `frontend/vite.config.ts`
- Service worker source: `frontend/src/sw-custom.ts`
- IndexedDB event store: `frontend/src/infrastructure/persistence/IndexedDBEventStore.ts`
- Sync store: `frontend/src/services/syncStore.ts`

## Real Limitations

- Some frontend modules still persist locally even though backend endpoints exist.
- Azure integrations require external configuration and are not self-proving from the repository alone.
- Documentation cannot claim uptime, certifications, or live customer use because the repo does not contain that evidence.

## Validation Snapshot

- `pnpm facts`: passed
- `pnpm docs:validate`: passed
- `pnpm typecheck`: passed
- `pnpm build`: passed
- `pnpm lint`: failed due to existing frontend ESLint violations
- `pnpm test`: frontend tests passed; backend tests failed in this environment with `listen EPERM` when Supertest-bound suites attempted to bind to `0.0.0.0`
