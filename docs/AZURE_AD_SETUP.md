# Azure / Entra ID Setup

Status: optional, partial, and disabled by default.

## Evidence In Code

- Frontend helper: `frontend/src/services/azure/azureAuth.ts`
- Backend middleware: `backend/src/middleware/azureADAuth.ts`
- Backend feature flag path: `backend/src/config/featureFlags.ts`

## What This Means

- The repository contains integration points for Entra ID sign-in.
- The repository does not include tenant credentials or a verified deployed setup.
- Treat this as an optional integration path, not a default runtime requirement.
