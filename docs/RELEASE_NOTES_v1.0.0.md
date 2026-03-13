# EFVM360 v1.0.0 — Release Notes

**Release Date:** 2026-03-12

## Overview

Initial production-ready release of EFVM360, an enterprise railway operations platform for digital shift handover and yard management.

## Highlights

### Shift Handover Digitization
- Complete 12-section handover form replacing paper-based workflows
- SHA-256 hash chain audit trail for tamper-evident event sourcing
- Multi-role workflow with approval and review stages

### Architecture
- DDD/CQRS/Event Sourcing frontend architecture
- 11 lazy-loaded page modules with domain-driven design
- 5 aggregate roots: ServicePass, YardCondition, OperationalEvent, SafetyProtocol, ShiftCrew

### Offline-First
- IndexedDB persistence with Service Worker caching
- Exponential backoff sync strategy
- Full functionality without network connectivity

### Testing
- 785 passing tests (588 Vitest + 197 Jest)
- Playwright E2E specs
- k6 load test scenarios

### Backend
- 85+ REST API endpoints with Express/Sequelize/MySQL
- JWT + refresh token authentication
- RBAC authorization with 4 hierarchical roles (Gestor, Inspetor, Maquinista, Oficial)
- LGPD compliance with data subject rights API

### Infrastructure
- Azure Bicep IaC with blue/green deployment support
- GitHub Actions CI/CD (4 workflows: CI, staging, production, security scan)
- Docker Compose for local development
- Vercel frontend deployment

### Additional Features
- AdamBot AI assistant (10 modules, voice, STT, memory)
- 5x5 risk assessment matrix (NR-01 aligned)
- BI+ operational dashboard with KPIs
- WCAG 2.1 AA accessibility
- PT-BR/EN bilingual support
- Glassmorphism design system (dark/light theme)

## Documentation

- Architecture Decision Records in `docs/ARCHITECTURE.md`
- Operational Runbook in `docs/RUNBOOK.md`
- LGPD Compliance in `docs/LGPD_COMPLIANCE.md`
- WCAG Checklist in `docs/WCAG_CHECKLIST.md`
- User Manual in `docs/MANUAL_USUARIO.md`
