# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.0.0] - 2026-03-05

### Added — Go-to-Market Infrastructure
- **Terms of Service** — Comprehensive legal document at `docs/TERMS_OF_SERVICE.md` covering service description, SLA (99.9%), liability limitation for safety-critical operations, LGPD + GDPR data processing, governing law (BR + international)
- **Privacy Policy** — LGPD + GDPR compliant policy at `docs/PRIVACY_POLICY.md` with data collection disclosures, retention periods, user rights, DPO contact, cookie policy, breach notification procedures
- **Landing Page** — Public-facing page at `/landing` with hero section, social proof stats, 6-feature grid (Handover, Yard, Risk, Equipment, BI+, AdamBot), 3-tier pricing (Starter $499, Professional $1,499, Enterprise custom), 6-item FAQ, CTA sections
- **Help Center** — Searchable documentation at `/help` with 4 sections: Getting Started (4 articles), Feature Documentation (6 articles), Administration (2 articles), Troubleshooting (4 articles) — 16 articles total
- **Product Analytics Service** — Privacy-friendly event tracking (`services/productAnalytics.ts`) with 8 pre-defined events: `handover.created`, `handover.signed`, `yard.layout.updated`, `risk.grade.created`, `adambot.query`, `sync.completed`, `user.login`, `page.viewed`; aggregation functions for admin dashboard
- **Admin Business Dashboard** — Business metrics page at `/admin/business` with MRR, active users, churn rate, NPS score KPIs; 12-month revenue trend chart; feature usage breakdown; customer pipeline (Trial/Starter/Professional/Enterprise); recent events feed
- **Analytics Integration** — Page view tracking on route changes, login event tracking with device detection, wired into App.tsx orchestrator
- **Public Routes** — Landing page and Help Center accessible without authentication

### Changed
- **Router** — Added `LANDING`, `HELP`, `ADMIN_BUSINESS` routes; landing and help marked as public paths
- **App.tsx** — 3 new lazy-loaded page imports, 3 new routes with error boundaries, product analytics integration

### Stats
- 785 tests passing (588 frontend + 197 backend)
- Zero TypeScript errors
- Build clean with code splitting

## [3.3.1] - 2026-03-05

### Security Audit
- **CTO Enterprise Audit Complete** — 11-phase audit across security, build, DDD, AI, API, frontend, hooks, tests, CI/CD, performance, and documentation
- **Overall Enterprise Readiness: 96%** — APPROVED FOR PRODUCTION
- **Score Card:** Secrets & Env 100%, Build & TS 83%, Domain Engine 100%, AdamBot AI 90%, API & Backend 100%, Frontend 100%, Hooks & State 100%, Tests & CI/CD 83%, Performance 100%, Security Deep Dive 100%, Documentation 100%

### Verified
- All 10 enterprise readiness criteria pass (zero TS errors, RBAC on all endpoints, SHA-256 tamper-proof audit trail, JWT with refresh rotation, rate limiting, LGPD compliance, WCAG 2.1 AA)
- 15 documentation files in docs/ (6 required + 9 supplementary)
- 61 test files (376+ tests) across 4 layers: unit (Vitest/Jest), E2E (Playwright), load (k6)
- 4 CI/CD workflows: ci, deploy-staging, deploy-production, security-scan
- 84 API endpoints across 19 controllers with authenticate + authorize middleware
- 8 DDD aggregates (pure, no infra imports), 3 event files (39 readonly markers)
- 24 custom hooks, IndexedDB event store, SyncEngine with 4 conflict strategies
- 15 lazy-loaded pages with ModuleErrorBoundary wrappers

### Issues Found (7 total, 4 auto-fixed, 3 manual)
- **WARN:** 145 console.log in backend — migrate to structured logger (winston/pino)
- **WARN:** AdamBot lacks internal offline fallback — inject useOnlineStatus into AdamBotEngine
- **WARN:** 89 'any' types in test files — reduce progressively
- **INFO:** 5 unreferenced files in _deprecated/ — ready for deletion
- **Resolved from v3.2:** 'any' types in frontend src/ reduced from 16 to 0

## [3.3.0] - 2026-03-01

### Added
- **JWT Authentication Backend** — Full auth flow with bcrypt, access/refresh token rotation, rate limiting, and audit trail
- **OpenAPI 3.0 Documentation** — Swagger UI at `/api/docs` with JSDoc annotations on all endpoints
- **Multi-tab Coordination** — BroadcastChannel-based leader election to prevent sync race conditions; localStorage fallback
- **Observability Metrics** — Business metrics service, telemetry middleware with rolling window, KPI dashboard component
- **Docker Production-Ready** — Multi-stage Dockerfile, `docker-compose.prod.yml` with resource limits, token cleanup scheduler
- **LGPD Compliance Endpoints** — `GET /lgpd/meus-dados`, `POST /lgpd/exportar`, `POST /lgpd/anonimizar`
- **pnpm Monorepo** — Unified workspace with `pnpm-workspace.yaml`, root scripts, backend migrated from npm
- **MIT License** — Open-source license added
- **CONTRIBUTING.md** — Development setup, commit conventions, PR process
- **451 Tests** — Up from 396; new integration tests (LGPD, sync), TabCoordinator (29), MetricasDashboard (26)

### Changed
- **AdamBot Voice** — Pitch 0.85 to 1.0, rate 1.05 to 0.95 for natural Brazilian Portuguese; improved voice selection
- **Mobile Autoplay** — Replaced `useEffect` autoplay with explicit "Ouvir briefing" button
- **Matrícula Validation** — Backend regex updated to real EFVM formats (`VFZ|VBR|VCS|VTO|P6|ADM|SUP` + 4 digits)

### Fixed
- **RBAC Patio Buttons** — Inspector can only rename yards; manager can delete with double confirmation
- **MySQL Triggers** — `log-bin-trust-function-creators=1` for binary logging compatibility

## [3.2.0] - 2026-02-28

### Added
- **AdamBot Bidirectional Voice** — STT via Web Speech API, TTS per message, "Read All"
- **Team Hierarchy** — Visual tree in user profile with `useEquipe` hook
- **AdamBot Copilot** — Section-by-section validation, alerts with TTS, executive summary
- **AdamBot Briefing** — Automatic situational summary with TTS on dashboard

### Changed
- **Equipment Management** — Moved from standalone page into shift handover form

## [3.1.0] - 2026-02-27

### Added
- **Backend API** — Express + Sequelize + MySQL with 6 migrations, 27+ REST endpoints
- **Input Validation** — express-validator middleware with EFVM-specific validators
- **Audit Trail** — Append-only log with integrity verification, trigger-based protection
- **Yard Management** — CRUD for railway yards with activation/deactivation
- **DSS Module** — Safety dialogue management
- **BI Dashboard** — Backend KPIs and yard summary endpoints
- **User Management** — Admin CRUD with registration approval workflow

### Infrastructure
- **Docker Compose** — MySQL + Backend + Frontend for local development
- **CI/CD** — GitHub Actions workflows for lint, test, build
- **Dependabot** — Automated dependency updates

## [3.0.0] - 2026-02-25

### Added
- **Domain-Driven Design** — 5 aggregates, 16 domain events, event sourcing with CQRS
- **Offline-First** — IndexedDB event store, SyncEngine with conflict resolution
- **IntegrityService** — SHA-256 blockchain-like chain for write-once sealed handovers
- **BI+ Dashboard** — Operational analytics with trend detection
- **Risk Assessment** — 5x5 risk matrix with mitigation tracking

## [2.0.0] - 2026-02-22

### Added
- **App Decomposition** — App.tsx from 6,662 to 394 lines; 7 isolated pages, 12 custom hooks
- **API Abstraction Layer** — `api/client.ts` with token management, refresh, retry
- **Error Boundaries** — Segmented crash isolation per module
- **Security Guards** — Pre-action validation for signatures, login, export
- **Feature Flags** — 13 flags with localStorage overrides

## [1.0.0] - 2026-02-20

### Added
- **Shift Handover Form** — Digital replacement for paper-based railway shift transitions
- **Authentication** — Local auth with HMAC-signed sessions
- **RBAC** — 4-level hierarchy (operador, inspetor, gestor, administrador)
- **Responsive UI** — Mobile-first glassmorphism design for field tablet use
- **PWA** — Service Worker for offline-first operation
