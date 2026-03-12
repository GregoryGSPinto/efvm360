# Monitoring

## Implemented Hooks

- Request telemetry middleware: `backend/src/middleware/telemetry.ts`
- Monitoring service: `backend/src/services/monitoringService.ts`
- Optional Application Insights initialization: `backend/src/server.ts`

## Current State

- Local development can run without any external monitoring service.
- Azure Application Insights is an optional integration path controlled by environment variables.
- The repository does not contain dashboards, alerts, or live metrics exports that prove production observability.
