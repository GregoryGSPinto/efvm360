# Architecture

## Implemented Structure

- Frontend SPA in `frontend/` using React, Vite, and TypeScript.
- Backend API in `backend/` using Express, Sequelize, and TypeScript.
- Browser persistence helpers for offline-capable flows.
- Optional WebSocket support.
- Test layers in Vitest, Jest, Playwright, and k6.

## Implemented Data Flow

1. The frontend can operate in local/demo mode without backend connectivity.
2. When `VITE_API_URL` is present, the frontend has API clients and sync utilities available.
3. The backend exposes `/api/v1` routes with auth, validation, and health endpoints.
4. MySQL is the intended persistent backend store when the API is connected.

## Partial Areas

- Frontend CRUD modules do not uniformly use the backend endpoints that already exist.
- Multiple sync-related implementations coexist in the frontend.
- Azure-specific services are optional, not default.

## Infrastructure Intent

The repository includes configuration for:

- Vercel frontend hosting
- Azure App Service and Static Web Apps deployment workflows
- Docker-based local development

Those assets are real configuration files, but they are not proof of a live environment by themselves.
