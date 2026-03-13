# Changelog

All notable changes to EFVM360 are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — 2026-03-12

### Added
- Complete monorepo structure (frontend, backend, infra, e2e, load-tests, docs)
- 11 lazy-loaded page modules with DDD domain layer
- 5 aggregate roots (ServicePass, YardCondition, OperationalEvent, SafetyProtocol, ShiftCrew)
- 85+ REST API endpoints with Express/Sequelize/MySQL
- JWT + refresh token authentication with Azure AD SSO (PKCE)
- RBAC authorization (4 hierarchical roles)
- SHA-256 hash chain audit trail (event sourcing)
- Offline-first architecture (IndexedDB + Service Worker + exponential backoff)
- AdamBot AI assistant (10 modules, voice, STT, memory)
- 5x5 risk assessment matrix (NR-01 aligned)
- BI+ operational dashboard with KPIs
- Azure Bicep IaC with blue/green deployment
- GitHub Actions CI/CD (4 workflows)
- 785 automated tests (588 Vitest + 197 Jest + Playwright + k6)
- LGPD compliance with data subject rights API
- WCAG 2.1 AA accessibility
- PT-BR/EN bilingual support
- Glassmorphism design system (dark/light theme)
- Enterprise documentation suite (Architecture, Runbook, Monitoring, LGPD, WCAG, User Manual)
- Frontend-to-backend integration for passagem form submission
- Docker Compose for local and production-style orchestration
- Vercel frontend deployment configuration

### Changed
- Standardized monorepo on pnpm across root scripts, package metadata, Vercel config, Dockerfiles, and GitHub Actions
- Rewrote public-facing documentation to distinguish implemented code, partial integration, and roadmap intent
- Renamed VFZ branding to EFVM360 across entire project

### Fixed
- Stabilized lint and test validation pipeline
- Resolved senior QA sweep findings (28 issues found, 3 fixed in code)
