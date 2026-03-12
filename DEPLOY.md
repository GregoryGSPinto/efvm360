# Deployment Guide

This repository contains deploy configuration, not a verified hosted environment. Use this file as an operator reference for reproducing the repository's intended deployment paths.

## Supported Paths

- Local development stack: `docker-compose.yml`
- Backend production-style container stack: `docker-compose.prod.yml`
- Frontend static deploy: `vercel.json`
- Azure CI/CD templates: `.github/workflows/deploy-staging.yml` and `.github/workflows/deploy-production.yml`

## Canonical Package Manager

All install and build commands in this repository use `pnpm`.

## Local Development

```bash
pnpm install
docker compose up -d
pnpm dev
```

Services exposed by default:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api/v1`
- MySQL: `localhost:3306`

## Environment Variables

### Backend

Required for backend startup outside pure demo mode:

```env
NODE_ENV=development
PORT=3001
API_PREFIX=/api/v1
DB_HOST=localhost
DB_PORT=3306
DB_NAME=efvm360_railway
DB_USER=efvm360_app
DB_PASSWORD=change-me
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
CORS_ORIGIN=http://localhost:5173
```

Optional code paths:

```env
DB_SSL=false
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
APPLICATIONINSIGHTS_CONNECTION_STRING=
APPINSIGHTS_INSTRUMENTATIONKEY=
AZURE_KEYVAULT_URL=
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
FEATURE_SSO_AZURE_AD=false
FEATURE_OFFLINE_MODE=true
FEATURE_DASHBOARD_BI=true
FEATURE_AUDIT_SYNC=false
FRONTEND_URL=http://localhost:5173
```

### Frontend

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_ENV=development
VITE_SHOW_DEMO_CREDENTIALS=false
VITE_WS_URL=http://localhost:3001
VITE_SENTRY_DSN=
VITE_AZURE_CLIENT_ID=
VITE_AZURE_TENANT_ID=
VITE_AZURE_REDIRECT_URI=
```

Feature flags are read from `VITE_FEATURE_*` variables when present.

## Build Commands

```bash
pnpm build
pnpm --filter @efvm360/frontend build
pnpm --filter @efvm360/backend build
```

Build outputs:

- Frontend: `frontend/dist`
- Backend: `backend/dist`

## Vercel

`vercel.json` is configured to:

- install with `pnpm install --frozen-lockfile`
- build the frontend with `pnpm --filter @efvm360/frontend build`
- publish `frontend/dist`

This only covers the static frontend. It does not provision the backend API or the database.

## Azure Workflows

The repository includes Azure deployment workflows that assume:

- existing App Service and Static Web Apps resources
- repository secrets for Azure credentials
- a reachable backend runtime environment

These workflows are configuration templates until those external prerequisites exist.

## Docker

### Development

```bash
docker compose up -d
```

### Production-style backend stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

Notes:

- The production-style compose file covers MySQL and backend only.
- Frontend static hosting is expected to be handled separately.

## Verification Checklist

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm docs:validate`

If you need deploy evidence beyond configuration, capture it separately in an environment-specific runbook.
