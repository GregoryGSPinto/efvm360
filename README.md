# EFVM360 — Enterprise Railway Operations Management

> **Portfolio Project** — This is an independent case study demonstrating enterprise architecture for railway operations. Built as a technical portfolio piece targeting the EFVM railway corridor. Not commissioned by or affiliated with Vale S.A.

<div align="center">

**Enterprise Railway Operations Platform** · Portfolio Case Study

Digital platform for railway shift handover, yard management, operational safety, and real-time decision support.

[![Build](https://github.com/GregoryGSPinto/efvm360/actions/workflows/ci.yml/badge.svg)](https://github.com/GregoryGSPinto/efvm360/actions)
[![Tests](https://img.shields.io/badge/tests-451%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)]()
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

## The Problem

Railway shift handovers at the main railway yard relied on paper forms — creating data loss, delayed communication, and safety blind spots across 24/7 operations. Inspectors, operators, and managers had no unified view of yard status, equipment condition, or risk posture during critical transitions.

## The Solution

EFVM360 replaces physical handover forms with an integrated digital platform covering the entire operational lifecycle: shift transitions, yard layout management, equipment tracking, risk assessment, BI dashboards, and an AI assistant for real-time operational guidance — all designed for field use on mobile devices with unreliable connectivity.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        EFVM360 Platform                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─ Frontend (React + TypeScript + Vite) ─────────────────────────┐  │
│  │                                                                 │  │
│  │  11 Pages (lazy) · 22 Hooks · 20+ Components · DDD Domain      │  │
│  │                                                                 │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │  │
│  │  │ Domain  │ │ App Layer│ │  Infra    │ │   UI / Pages     │   │  │
│  │  │         │ │          │ │           │ │                  │   │  │
│  │  │ 5 Aggr. │ │ UseCases │ │ IndexedDB │ │ Passagem · BI+   │   │  │
│  │  │ Events  │ │ Services │ │ API Client│ │ Layout · Riscos  │   │  │
│  │  │ Contracts│ │ Handlers│ │ Security  │ │ Equip. · Gestão  │   │  │
│  │  └─────────┘ └──────────┘ └───────────┘ └──────────────────┘   │  │
│  │                                                                 │  │
│  │  AdamBot AI Assistant (10 modules · voice · STT · memory)       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Backend (Express + TypeScript + Sequelize) ───────────────────┐  │
│  │  12 Controllers · 8 Models · Auth + RBAC + Audit               │  │
│  │  JWT · bcrypt · HMAC SHA-256 · Rate Limiting · LGPD            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Data ─────────────────────────────────────────────────────────┐  │
│  │  MySQL 8.0 (Azure Flexible Server)                             │  │
│  │  8 tables · Event Sourcing · SHA-256 Hash Chain Audit Trail    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Infrastructure ───────────────────────────────────────────────┐  │
│  │  Azure Bicep IaC · GitHub Actions CI/CD · Docker Compose       │  │
│  │  App Insights Monitoring · Key Vault · Blue/Green Deploy       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Domain-Driven Design

The frontend implements a pure domain layer following DDD, CQRS, and Event Sourcing patterns:

| Layer | Contents |
|-------|----------|
| **Domain** | 5 Aggregates (ServicePass, YardCondition, OperationalEvent, SafetyProtocol, ShiftCrew) · Domain Events · Value Objects · Contracts |
| **Application** | Use Cases · Event Handlers · Command/Query separation |
| **Infrastructure** | IndexedDB persistence · API client · Security services · Offline sync |
| **UI** | 11 page modules · 22 custom hooks · Reusable component library |

---

## Features

### Shift Handover (Passagem de Serviço)
Digital form replacing paper-based handover with 12 sections: header, upper/lower yard status, layout/switches, attention points, VP interventions, equipment, 5S inspection, safety protocols, previous shift notes, audit trail, and signatures.

### Yard Layout Management
Multi-patio support with configurable yard locations, full CRUD for track lines, categories, and AMV (Automated Switch) positions. Auto-provisioning with realistic seed data for the primary yard.

### Operational Risk Assessment
5×5 probability × impact risk matrix aligned with NR-01 standards and industry safety-first principles. Full CRUD for risk grades with mitigation measures, severity classification, and KPI dashboard.

### Equipment Management
Categorized equipment inventory (Communication, Signaling, Safety, Measurement, Tools, PPE) with criticality levels, minimum quantities per shift, and inline management within handover forms.

### BI+ Dashboard
Operational intelligence with KPIs answering questions like "Which track gives me the most trouble?" and "What's our yard occupancy trend?" — designed as support, not surveillance.

### AdamBot AI Assistant
10-module AI system with voice input/output, speech-to-text, conversation memory, audit trail, and proactive notifications. Draggable floating interface with offline capability.

### 5S Workplace Organization
Digital 5S inspection aligned with industry standards for railway yard operations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript 5 · Vite · pnpm |
| State | Custom hooks · IndexedDB (offline-first) · localStorage |
| Backend | Express · TypeScript · Sequelize ORM |
| Database | MySQL 8.0 (Azure Flexible Server) |
| Auth | JWT + Refresh Token · bcrypt · Azure AD SSO (PKCE) |
| Security | HMAC SHA-256 integrity chain · RBAC (4 roles) · Rate limiting · LGPD compliance |
| Infrastructure | Azure App Service · Static Web Apps · Key Vault · Bicep IaC |
| CI/CD | GitHub Actions (4 workflows) · Blue/green deploy · Dependabot |
| Monitoring | Azure Application Insights · KQL dashboards |
| Testing | Vitest (unit) · Playwright (E2E) · k6 (load) |
| Design | Glassmorphism · Corporate green/yellow · Dark/light theme · Mobile-first |

---

## Project Structure

```
efvm360/
├── frontend/                          # React + TypeScript + Vite
│   ├── src/
│   │   ├── domain/                    # Pure DDD domain layer
│   │   │   ├── aggregates/            # 5 aggregate roots
│   │   │   ├── events/                # Domain events (CQRS)
│   │   │   ├── value-objects/         # Immutable value types
│   │   │   └── contracts/             # Interface contracts
│   │   ├── application/               # Use cases + event handlers
│   │   ├── infrastructure/            # IndexedDB, API, security
│   │   ├── pages/                     # 11 lazy-loaded pages
│   │   │   ├── dashboard/             # Main operational dashboard
│   │   │   ├── passagem/              # Shift handover form (12 sections)
│   │   │   ├── analytics/             # BI+ dashboard
│   │   │   ├── layout-patio/          # Yard layout management
│   │   │   ├── graus-risco/           # Risk assessment (5×5 matrix)
│   │   │   ├── equipamentos/          # Equipment management
│   │   │   ├── gestao/                # Team management
│   │   │   ├── historico/             # Shift history
│   │   │   ├── perfil/                # User profile
│   │   │   ├── configuracoes/         # Settings
│   │   │   └── suporte/               # Support
│   │   ├── hooks/                     # 22 custom hooks
│   │   ├── components/                # Reusable UI + AdamBot (10 modules)
│   │   ├── services/                  # Security, validation, logging
│   │   ├── api/                       # API client + DTOs
│   │   ├── router/                    # Route definitions
│   │   ├── styles/                    # Theme system (glassmorphism)
│   │   ├── utils/                     # Constants, helpers
│   │   └── types/                     # TypeScript interfaces
│   ├── __tests__/                     # 277 unit tests (Vitest)
│   └── public/                        # PWA assets (sw.js, manifest.json)
│
├── backend/                           # Express + TypeScript + Sequelize
│   ├── src/
│   │   ├── controllers/               # 12 controllers
│   │   ├── models/                    # 8 Sequelize models
│   │   ├── middleware/                # Auth, Azure AD, security, rate limiting
│   │   ├── services/                  # Monitoring, Key Vault
│   │   ├── routes/                    # API routes
│   │   └── migrations/                # Schema + seed data
│   ├── __tests__/                     # Unit + integration tests (Jest)
│   └── Dockerfile
│
├── e2e/                               # End-to-end tests (Playwright)
├── load-tests/                        # Performance scenarios (k6)
├── infra/                             # Azure Bicep IaC modules
├── docs/                              # Enterprise documentation
│   ├── ARCHITECTURE.md                # C4 diagrams + ADRs + NFRs
│   ├── MANUAL_USUARIO.md              # User manual
│   ├── RUNBOOK.md                     # Operational runbook
│   ├── MONITORING.md                  # App Insights + KQL
│   ├── LGPD_COMPLIANCE.md             # Data protection compliance
│   └── WCAG_CHECKLIST.md              # Accessibility (WCAG 2.1 AA)
├── .github/workflows/                 # CI/CD pipelines
└── docker-compose.yml                 # Full stack local environment
```

---

## Quick Start

```bash
# Prerequisites: Node.js 18+, pnpm, Docker

# Full stack (recommended)
docker-compose up -d
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001

# Frontend only
cd frontend && pnpm install && pnpm dev

# Backend only
cd backend && npm install && npm run dev

# Database seed
cd backend && npm run migrate && npm run migrate:seed
```

### Default Users

| Role | Matrícula | Credentials |
|------|-----------|-------------|
| Gestor (Manager) | demo-admin | System admin |
| Inspetor (Inspector) | demo-inspector | Yard inspector |
| Maquinista (Operator) | demo-operator | Train operator |
| Oficial (Officer) | demo-officer | Operations officer |

---

## Testing

| Layer | Framework | Count | Command |
|-------|-----------|-------|---------|
| Frontend Unit | Vitest + jsdom | 277 | `cd frontend && pnpm test` |
| Backend Unit | Jest + SQLite | 74+ | `cd backend && npm test` |
| E2E | Playwright | 25 | `cd e2e && npx playwright test` |
| Load | k6 | 5 scenarios | `cd load-tests && ./run.sh` |

---

## Security

- **Authentication:** JWT + refresh token rotation + Azure AD SSO (PKCE)
- **Authorization:** RBAC with 4 hierarchical roles (gestor → inspetor → maquinista → oficial)
- **Integrity:** SHA-256 hash chain on audit trail (event sourcing)
- **Anti-tampering:** HMAC session verification + device fingerprint
- **Data protection:** LGPD-compliant with data subject rights API
- **Infrastructure:** Azure Key Vault for secrets, rate limiting, CORS/Helmet

---

## Offline-First Architecture

Designed for railway environments with unreliable connectivity:

- **IndexedDB** for local persistence and queue management
- **Service Worker** for offline page caching (PWA)
- **Exponential backoff with jitter** for retry logic
- **Conflict detection and resolution** for concurrent operations
- **Automatic sync** when connectivity is restored

---

## Deploy

```bash
# Azure (Infrastructure as Code)
az deployment sub create \
  --template-file infra/bicep/main.bicep \
  --parameters @infra/bicep/parameters/production.json \
  dbAdminPassword=<SECRET> jwtSecret=$(openssl rand -base64 64)

# CI/CD: push to main → staging auto-deploy → smoke test → blue/green swap to production
```

---

## Documentation

| Document | Description |
|----------|------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | C4 diagrams, ADRs, NFRs |
| [MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) | End-user manual (PT-BR) |
| [RUNBOOK.md](docs/RUNBOOK.md) | Incident response, backup, maintenance |
| [MONITORING.md](docs/MONITORING.md) | App Insights + KQL dashboards |
| [LGPD_COMPLIANCE.md](docs/LGPD_COMPLIANCE.md) | Data protection compliance |
| [WCAG_CHECKLIST.md](docs/WCAG_CHECKLIST.md) | Accessibility audit (WCAG 2.1 AA) |

---

## Author

**Gregory G. S. Pinto** — UX/UI & AI Specialist · Solution Architect

Architecture, design, and implementation of enterprise railway operations management platform for Brazilian railway operations.

---

<div align="center">

*Built for safety-critical railway operations — "Life First" (A Vida em Primeiro Lugar)*

Portfolio project demonstrating enterprise railway operations architecture

</div>
