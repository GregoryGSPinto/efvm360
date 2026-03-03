# Auditoria README.md -- EFVM360
**Data:** 2026-03-01
**Commit:** fa2dcf4

---

## 1. RESUMO EXECUTIVO

O README esta ~35% alinhado com o codigo real. As principais divergencias sao: (1) diretorio do frontend e chamado `frontend/`, mas o README usa `vfz/` e `efvm360/` em lugares diferentes; (2) numeros de paginas, hooks, services, controllers, tabelas e testes estao TODOS desatualizados; (3) Quick Start tem credenciais erradas, comandos errados (npm vs pnpm) e caminhos errados.

## 2. CORRETO

- **Stack Frontend (React 18 + TypeScript + Vite):** Confirmado -- package.json usa React 18.2, TypeScript 5.2, Vite 5.0
- **Backend (Express + TypeScript + Sequelize):** Confirmado -- backend/package.json tem express 4.18, sequelize 6.37
- **MySQL 8.0:** Confirmado -- backend usa mysql2 package
- **JWT backend:** Confirmado -- jsonwebtoken 9.0 em backend/package.json
- **bcrypt backend:** Confirmado -- bcryptjs 2.4.3 em backend/package.json
- **Rate limiting backend:** Confirmado -- express-rate-limit 7.1.5 em backend/package.json
- **Azure AD SSO:** Confirmado -- middleware/azureADAuth.ts e azureAuth.ts existem
- **PWA (Service Worker):** Confirmado -- frontend/public/sw.js e manifest.json existem
- **IndexedDB/Offline-first:** Confirmado -- 12 arquivos referenciam IndexedDB
- **Glassmorphism:** Confirmado -- backdropFilter usado em 5+ componentes
- **SHA-256 / HMAC:** Confirmado -- IntegrityService.ts + security.ts
- **Audit Trail hash chain:** Confirmado -- domain/services/IntegrityService.ts existe
- **RBAC hierarquico:** Confirmado -- RBACPolicy.ts + usePermissions.ts
- **Error Boundaries:** Confirmado -- ErrorBoundary.tsx + ModuleErrorBoundary.tsx
- **GitHub Actions (4 workflows):** Confirmado -- ci.yml, deploy-production.yml, deploy-staging.yml, security-scan.yml
- **Dependabot:** Confirmado -- .github/dependabot.yml existe
- **CODEOWNERS:** Confirmado -- .github/CODEOWNERS existe
- **Azure Bicep IaC:** Confirmado -- infra/bicep/main.bicep + 5 modulos
- **k6 Load Tests (5 cenarios):** Confirmado -- load-tests/scenarios/ tem 5 arquivos JS
- **DDD com aggregates:** Confirmado -- 4 aggregates (LocomotiveInspection, UserAggregate, YardConfiguration, YardRegistry)
- **Event Sourcing:** Confirmado -- EventPayloadMap com 16 ServicePass event types
- **CQRS EventProjector:** Confirmado -- infrastructure/cqrs/EventProjector.ts existe
- **IndexedDBEventStore:** Confirmado -- infrastructure/persistence/IndexedDBEventStore.ts
- **SyncEngine:** Confirmado -- infrastructure/persistence/SyncEngine.ts
- **ConflictResolution:** Confirmado -- infrastructure/persistence/ConflictResolution.ts
- **Documentacao enterprise:** Confirmado -- docs/ tem 13 documentos

## 3. DESATUALIZADO

- **Frontend dir "vfz/":** README diz `cd efvm360 && npm install` e estrutura mostra `vfz/` --> realidade e `frontend/` com `pnpm`
- **CI Badges URL:** README aponta para `github.com/vale/vfz` --> repo real e `github.com/GregoryGSPinto/efvm360`
- **Credenciais Quick Start:** README diz "Vale001 / Vale@2024" --> realidade: matriculas como VFZ1001, senha `123456`
- **App.tsx linhas:** README diz "394L" --> realidade: 819 linhas
- **Paginas:** README diz "7 Pages" --> realidade: 11 paginas (inicial, passagem, dss, analytics, historico, layout-patio, graus-risco, equipamentos, configuracoes, gestao, perfil, suporte)
- **Hooks:** README diz "12 Hooks" --> realidade: 22 hooks
- **Services frontend:** README diz "13 Services" --> realidade: 19 service files
- **Controllers backend:** README diz "5" --> realidade: 12 controller files
- **Routes backend:** README diz "2" --> realidade: 3 route files (index.ts, lgpdRoutes.ts, syncRoutes.ts)
- **Tabelas/Models backend:** README diz "3 tables (usuarios, passagens, audit_trail)" --> realidade: 8 models (Usuario, Passagem, AuditTrail, DSS, CadastroPendente, SenhaReset, UsuarioConfig, AdamBootPerfil)
- **Testes frontend:** README diz "130" --> realidade: 277 testes passando (11 test files)
- **RBAC niveis:** README diz "5 niveis (operador -> administrador)" --> CLAUDE.md diz "4 niveis hierarquicos" (maquinista, oficial, inspetor, gestor)
- **Testes "90/90":** CLAUDE.md diz "90 testes" --> realidade: 277 testes passando
- **Domain Events:** README diz "16 domain events" --> realidade: 16 ServicePass + 10 User = 26 event types
- **Aggregates:** README diz "5 aggregates" --> realidade: 4 aggregate files
- **Componentes UI:** README nao especifica contagem --> realidade: 32 componentes .tsx
- **CODEOWNERS paths:** Referencia `/vfz/` --> deveria ser `/frontend/`
- **Dependabot directory:** Referencia `/vfz` --> deveria ser `/frontend/`
- **docker-compose.yml:** README implica estar na raiz (`docker-compose up -d`) --> esta em `docker/docker-compose.yml`

## 4. NAO EXISTE

- **ISnapshotStore port:** README diz "ISnapshotStore" em domain/ports/ --> so existe IEventStore.ts
- **ISyncQueue port:** README diz "ISyncQueue" em domain/ports/ --> nao encontrado
- **Value Objects "TrainStatus, AlertLevel, Turno":** README diz esses 3 --> so existe RiskMatrix.ts
- **docker-compose.yml na raiz:** Nao existe (esta em docker/docker-compose.yml)
- **Documentos README lista:** ARCHITECTURE.md existe mas com nome diferente (ARCHITECTURE.md + ARCHITECTURE_OVERVIEW.md). Os demais existem.
- **Backend Dockerfile na raiz README sugere:** Existe em backend/Dockerfile -- OK
- **`npm run migrate && npm run migrate:seed` no Quick Start:** Backend usa npm, mas o caminho para o backend e `backend/`, nao `cd backend` isolado sem contexto

## 5. NAO DOCUMENTADO

- **AdamBot assistente IA:** 10 arquivos em components/AdamBot/ (Engine, Voice, STT, Memory, Audit, Actions, Notifications, Panel, Context) -- nenhuma mencao no README
- **Pagina Graus de Risco Operacional:** Matriz 5x5, CRUD com mitigacoes (pages/graus-risco/) -- nao documentada
- **Pagina Equipamentos Operacionais:** CRUD com categorias e criticidade (pages/equipamentos/) -- nao documentada
- **Pagina Perfil:** pages/perfil/ -- nao documentada
- **Pagina Suporte:** pages/suporte/ -- nao documentada
- **Dashboard BI+:** components/dashboard/DashboardBI.tsx com ECharts -- nao documentado
- **Tour Guiado:** components/ui/GuidedTour.tsx + hooks/useTour.ts -- nao documentado
- **Multi-Patio dinâmico:** hooks/usePatio.ts + YardRegistry aggregate -- nao documentado
- **Design Tokens:** theme/design-tokens.ts -- nao documentado
- **Domain RiskMatrix:** domain/value-objects/RiskMatrix.ts -- nao documentado
- **OperationalPolicies (10 regras):** domain/policies/OperationalPolicies.ts -- nao documentado
- **LGPD backend:** controllers/lgpdController.ts + routes/lgpdRoutes.ts -- parcialmente documentado
- **Sync engine frontend:** hooks/usePassagemSync.ts + services/syncEngine.ts + services/syncStore.ts -- nao documentado
- **Feature Flags:** services/featureFlags.ts -- nao documentado
- **Error Reporting:** services/ErrorReportService.ts -- nao documentado
- **Online Status:** hooks/useOnlineStatus.ts + components/layout/OnlineIndicator.tsx -- nao documentado
- **AI/ML features:** hooks/useAI.ts + components/operacional/AIRiskScore.tsx + components/dashboard/AIInsightChart.tsx -- nao documentado
- **CHANGELOG.md:** Existe na raiz -- nao referenciado
- **SA_ROADMAP.md:** docs/SA_ROADMAP.md -- nao referenciado
- **ADR_SYNC_ENGINE.md:** docs/ADR_SYNC_ENGINE.md -- nao referenciado
- **PRIVACY_NOTICE.md:** docs/PRIVACY_NOTICE.md -- nao referenciado
- **Testes de Stress:** __tests__/stress/stress.test.ts (10K events, 50K generation) -- nao documentado
- **React Router v7:** package.json usa react-router-dom 7.13.1 -- README nao menciona routing
- **ECharts:** package.json depende de echarts 5.5 -- nao documentado
- **pnpm como package manager:** packageManager field no package.json -- README mostra npm

## 6. NUMEROS

| Item | README | Real | Status |
|------|--------|------|--------|
| Paginas | 7 | 11 | DESATUALIZADO |
| Hooks | 12 | 22 | DESATUALIZADO |
| Services Frontend | 13 | 19 | DESATUALIZADO |
| Componentes .tsx | (nao diz) | 32 | NAO DOCUMENTADO |
| Controllers Backend | 5 | 12 | DESATUALIZADO |
| Routes Backend | 2 | 3 | DESATUALIZADO |
| Models/Tabelas Backend | 3 | 8 | DESATUALIZADO |
| Testes Frontend | 130 | 277 (11 files) | DESATUALIZADO |
| Testes Backend | 74 | 12 files (nao executou) | NAO VERIFICAVEL |
| Testes E2E | 25 | 5 spec files | DESATUALIZADO |
| Load Tests | 5 | 5 | CORRETO |
| App.tsx linhas | 394 | 819 | DESATUALIZADO |
| Domain Events | 16 | 26 (16 SP + 10 User) | DESATUALIZADO |
| Aggregates | 5 | 4 files | DESATUALIZADO |
| Value Objects | 3 (TrainStatus, AlertLevel, Turno) | 1 (RiskMatrix) | DESATUALIZADO |
| Ports | 3 (IEventStore, ISnapshotStore, ISyncQueue) | 1 (IEventStore) | DESATUALIZADO |
| Docs Enterprise | 10 | 13 | DESATUALIZADO |
| Bicep Modules | 6 | 6 (main + 5) | CORRETO |
| GitHub Workflows | 4 | 4 | CORRETO |
| AdamBot Components | (nao diz) | 10 files | NAO DOCUMENTADO |

## 7. ESTRUTURA REAL

```
efvm360/
|-- .github/
|   |-- workflows/           # 4 GitHub Actions (ci, deploy-staging, deploy-prod, security)
|   |-- CODEOWNERS
|   |-- dependabot.yml
|-- backend/                  # Express + TypeScript + Sequelize + MySQL
|   |-- src/
|   |   |-- server.ts
|   |   |-- config/
|   |   |-- controllers/      # 12 controllers
|   |   |-- middleware/        # auth, azureADAuth, azureAuth, security, validators/
|   |   |-- migrations/       # 5 migrations + run.ts + seed.ts
|   |   |-- models/           # 8 Sequelize models (index.ts + Patio.ts)
|   |   |-- routes/           # 3 route files
|   |   |-- services/         # 5 services (audit, auth, keyVault, monitoring, patio)
|   |   |-- utils/
|   |-- __tests__/            # 12 test files (unit + integration)
|   |-- Dockerfile
|   |-- package.json          # npm, Express, JWT, bcrypt, Sequelize, mysql2
|-- frontend/                 # React 18 + TypeScript + Vite
|   |-- src/
|   |   |-- App.tsx           # 819 linhas (orchestrator)
|   |   |-- api/              # 3 files (client, contracts, index)
|   |   |-- application/      # use-cases/ (ServicePassUseCases)
|   |   |-- components/       # 32 .tsx files
|   |   |   |-- AdamBot/      # 10 files (Engine, Voice, STT, Memory, Audit...)
|   |   |   |-- dashboard/    # DashboardBI, ECharts, Graficos, AIInsightChart
|   |   |   |-- ErrorBoundary/ # ModuleErrorBoundary
|   |   |   |-- layout/       # TopNavbar, MobileBottomNav, OnlineIndicator
|   |   |   |-- operacional/  # AIRiskScore, BoaJornada, Checklist, YardSelector
|   |   |   |-- sync/         # SyncIndicator
|   |   |   |-- tables/       # TabelaPatio, TabelaEquipamentos
|   |   |   |-- ui/           # StatCard, GuidedTour, PermissionGuard, etc.
|   |   |-- config/           # environment.ts
|   |   |-- domain/           # DDD puro
|   |   |   |-- aggregates/   # 4 aggregates
|   |   |   |-- contracts.ts  # 20+ interfaces
|   |   |   |-- events/       # 26 event types (16 SP + 10 User)
|   |   |   |-- policies/     # OperationalPolicies (10) + RBACPolicy
|   |   |   |-- ports/        # IEventStore
|   |   |   |-- services/     # IntegrityService (SHA-256)
|   |   |   |-- value-objects/ # RiskMatrix
|   |   |-- hooks/            # 22 custom hooks
|   |   |-- infrastructure/   # CQRS, Observability, Persistence
|   |   |-- pages/            # 11 paginas (lazy loaded)
|   |   |-- router/           # routes.ts (14 rotas)
|   |   |-- services/         # 19 service files
|   |   |-- styles/           # themes.ts (sidebar items)
|   |   |-- theme/            # design-tokens.ts
|   |   |-- types/            # TypeScript types
|   |   |-- _deprecated/      # 5 arquivos em quarentena
|   |-- __tests__/            # 10 test files (277 test cases)
|   |-- public/               # PWA (sw.js, manifest.json)
|   |-- package.json          # pnpm, React 18, Vite, ECharts, react-router-dom 7
|-- docker/
|   |-- docker-compose.yml    # MySQL + Backend + Frontend
|-- docs/                     # 13 documentos enterprise
|-- e2e/                      # 5 Playwright spec files
|-- infra/
|   |-- bicep/                # Azure IaC (main + 5 modules)
|-- load-tests/               # 5 k6 scenarios
|-- CHANGELOG.md
|-- README.md
|-- vercel.json
|-- package.json (raiz)
```

## 8. RECOMENDACOES

### ALTA (incorreto -- gera confusao imediata)
1. **Corrigir caminhos:** `vfz/` e `efvm360/` --> `frontend/` em TODO o README, CODEOWNERS e dependabot
2. **Corrigir credenciais Quick Start:** `Vale001 / Vale@2024` --> `VFZ1001 / 123456` (ou ADM9001)
3. **Corrigir CI badges:** `vale/vfz` --> `GregoryGSPinto/efvm360`
4. **Corrigir docker-compose path:** `docker-compose up -d` --> `cd docker && docker-compose up -d`
5. **Corrigir package manager:** `npm install && npm run dev` --> `pnpm install && pnpm dev`
6. **Corrigir contagens do diagrama de arquitetura:** Pages 7-->11, Hooks 12-->22, Services 13-->19, Controllers 5-->12, Routes 2-->3, Tables 3-->8, App.tsx 394-->819

### MEDIA (desatualizado -- imprecisao tecnica)
7. **Atualizar contagem de testes:** Frontend 130-->277, E2E 25-->5 specs, Domain Events 16-->26
8. **Atualizar aggregates/ports/value-objects:** Remover nao-existentes (ISnapshotStore, ISyncQueue, TrainStatus, AlertLevel, Turno)
9. **Atualizar RBAC niveis:** 5 niveis --> 4 niveis (maquinista, oficial, inspetor, gestor) + suporte
10. **Atualizar docs:** 10 --> 13 documentos
11. **Remover referencia a "Patio do Fazendao":** Sistema agora e multi-patio (VFZ, VBR, VCS, P6, VTO)

### BAIXA (melhorias -- features nao documentadas)
12. **Documentar AdamBot:** Assistente IA enterprise com voz, STT, memoria, audit trail
13. **Documentar BI+ Dashboard:** ECharts, AI insights
14. **Documentar Graus de Risco:** Matriz 5x5, mitigacoes
15. **Documentar Equipamentos:** CRUD com categorias e criticidade
16. **Documentar Multi-Patio dinamico:** 5 patios com provisioning automatico
17. **Documentar Feature Flags, Tour Guiado, Stress Tests**
18. **Documentar React Router v7 + ECharts como dependencias**
19. **Adicionar secao "Arquitetura DDD" detalhada:** Explicar camadas domain/application/infrastructure
