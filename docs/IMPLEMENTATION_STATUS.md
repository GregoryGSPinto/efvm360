# Implementation Status

## Summary

Status labels:

- `implemented`: observable in current code paths
- `partial`: code exists but end-to-end behavior is incomplete or conditional
- `planned`: architectural direction only

| Domain | Status | Evidence | Risk | Next step |
| --- | --- | --- | --- | --- |
| Frontend routing and UI modules | implemented | `frontend/src/App.tsx`, `frontend/src/router/routes.ts`, `frontend/src/pages/*` | Large surface area increases regression risk | Add route-level smoke coverage |
| Local auth and demo/offline mode | implemented | `frontend/src/hooks/useAuth.ts`, `frontend/src/services/seedCredentials.ts` | Diverges from backend auth behavior | Reduce duplicated auth logic |
| Backend JWT auth and RBAC | implemented | `backend/src/services/authService.ts`, `backend/src/middleware/auth.ts`, `backend/src/routes/index.ts` | Needs environment-backed secrets | Add deployment smoke test |
| Passagem CRUD in frontend | implemented | `frontend/src/hooks/useFormulario.ts`, `frontend/src/pages/passagem/index.tsx` | Primarily local persistence today | Connect to backend passagens endpoints |
| Passagem API | implemented | `backend/src/controllers/passagensController.ts`, `backend/src/routes/index.ts` | Frontend does not fully consume it | Add integration coverage with real frontend flow |
| Offline persistence helpers | implemented | `frontend/src/infrastructure/persistence/*`, `frontend/src/services/syncStore.ts`, `frontend/src/sw-custom.ts` | Duplicate sync paths create ambiguity | Consolidate to one sync engine |
| Frontend-to-backend sync | partial | `frontend/src/services/syncEngine.ts`, `frontend/src/hooks/usePassagemSync.ts`, `backend/src/controllers/syncController.ts` | Multiple implementations and incomplete adoption | Choose one path and wire it into CRUD flows |
| DSS frontend | implemented | `frontend/src/hooks/useDSS.ts`, `frontend/src/pages/dss/index.tsx` | Local mode can drift from backend schema | Connect to backend endpoints |
| DSS backend | implemented | `backend/src/controllers/dssController.ts`, `backend/src/routes/index.ts` | Not fully exercised by UI | Add end-to-end coverage |
| Risk grades | partial | frontend page and backend routes both exist | Frontend/backend parity is not proven | Define one canonical data contract |
| Equipment management | partial | frontend hook and backend controller both exist | Same parity issue as risk grades | Add integration tests |
| WebSocket support | partial | `frontend/src/hooks/useWebSocket.ts`, `backend/src/services/websocket.ts` | Runtime behavior depends on backend availability and JWT | Add documented startup path |
| Azure/Entra authentication | partial | `frontend/src/services/azure/azureAuth.ts`, `backend/src/middleware/azureADAuth.ts` | Requires external tenant configuration | Keep disabled by default and document as optional |
| Application Insights / Key Vault hooks | partial | `backend/src/services/monitoringService.ts`, `backend/src/services/keyVaultService.ts` | External service dependency | Document as optional infrastructure integration |
| CI validation | implemented | `.github/workflows/ci.yml` | CI does not prove cloud deployment | Add deploy smoke validation when environment exists |
| Azure deployment workflows | partial | `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml` | No live environment evidence in repo | Verify in a real subscription before claiming readiness |
| Legal/compliance posture | implemented as documentation only | `LICENSE`, README disclaimers, this docs set | No external legal review implied | Keep portfolio wording explicit |
