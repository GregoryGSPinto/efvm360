# Passagem de Serviço Ferroviária

[![CI](https://github.com/vale/vfz/actions/workflows/ci.yml/badge.svg)](https://github.com/vale/vfz/actions/workflows/ci.yml)
[![Deploy Staging](https://github.com/vale/vfz/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/vale/vfz/actions/workflows/deploy-staging.yml)
[![Deploy Production](https://github.com/vale/vfz/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/vale/vfz/actions/workflows/deploy-production.yml)
[![Security](https://github.com/vale/vfz/actions/workflows/security-scan.yml/badge.svg)](https://github.com/vale/vfz/actions/workflows/security-scan.yml)

Sistema digital de passagem de serviço para a **Estrada de Ferro Vitória a Minas (EFVM)** — Vale S.A.  
**Pátio do Fazendão** | React + Express + MySQL | Azure

---

## Quick Start

```bash
# Docker (recomendado)
docker-compose up -d            # MySQL + Backend + Frontend
# Acesse: http://localhost:5173 — Credenciais: Vale001 / Vale@2024

# Manual
cd backend && npm install && npm run dev    # API :3001
cd efvm360 && npm install && npm run dev        # Frontend :5173
```

### Seed (dados iniciais)

```bash
cd backend && npm run migrate && npm run migrate:seed
```

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite)                   │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ App.tsx │→│ 7 Pages  │ │ 12 Hooks │ │ 13 Services │  │
│  │ 394L   │ │ Lazy     │ │ Custom   │ │ Security+API│  │
│  └────────┘ └──────────┘ └──────────┘ └─────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Backend (Express + TypeScript + Sequelize)             │
│  ┌──────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐   │
│  │Routes│→│Controllers│→│ Models   │ │ Middleware  │   │
│  │ 2    │ │ 5         │ │ 3 tables │ │ Auth+RBAC   │   │
│  └──────┘ └───────────┘ └──────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────────┤
│  MySQL 8.0 (Azure Flexible Server em prod)              │
│  usuarios | passagens | audit_trail                     │
└─────────────────────────────────────────────────────────┘
```

---

## Estrutura do Projeto

```
├── vfz/                        # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx             # Orchestrator (394L — decomposed from 6662L)
│   │   ├── api/                # API client + DTOs/contracts
│   │   ├── config/             # Environment config (dev/staging/prod)
│   │   ├── hooks/              # 12 custom hooks (auth, form, session, alerts...)
│   │   ├── pages/              # 7 page components (lazy loaded)
│   │   ├── services/           # Security, validation, permissions, logging, feature flags
│   │   ├── components/         # UI components + error boundaries
│   │   └── types/              # TypeScript interfaces
│   ├── __tests__/              # 130 testes unitários (Vitest)
│   └── public/                 # PWA (sw.js, manifest.json)
│
├── backend/                    # Backend Express + TypeScript + MySQL
│   ├── src/
│   │   ├── server.ts           # Entry point
│   │   ├── routes/             # API routes
│   │   ├── controllers/        # Auth, Passagens, Audit, Users, LGPD
│   │   ├── models/             # Sequelize models (Usuario, Passagem, AuditTrail)
│   │   ├── middleware/         # Auth, Azure AD, Security, Rate limiting
│   │   ├── services/           # Monitoring, Key Vault
│   │   └── migrations/         # DB schema + seed data
│   ├── __tests__/              # 74 testes unitários (Jest)
│   └── Dockerfile
│
├── e2e/                        # 25 testes E2E (Playwright)
├── load-tests/                 # 5 cenários k6 (login burst, stress, shift change...)
├── infra/                      # Azure Bicep IaC (6 modules)
├── .github/                    # CI/CD (4 workflows + Dependabot + CODEOWNERS)
├── docs/                       # 10 documentos enterprise
│   ├── ARCHITECTURE.md         # C4 diagrams + ADRs + NFRs
│   ├── MANUAL_USUARIO.md       # User manual (7 chapters)
│   ├── RUNBOOK.md              # Operational runbook
│   ├── LGPD_COMPLIANCE.md      # LGPD compliance
│   ├── MONITORING.md           # App Insights + KQL dashboards
│   ├── WCAG_CHECKLIST.md       # Accessibility checklist
│   └── ...
└── docker-compose.yml          # Full stack local environment
```

---

## Testes

| Camada | Framework | Quantidade | Comando |
|--------|-----------|-----------|---------|
| Backend Unit | Jest + SQLite | 74 | `cd backend && npm test` |
| Frontend Unit | Vitest + jsdom | 130 | `cd efvm360 && npm test` |
| E2E | Playwright | 25 | `cd e2e && npx playwright test` |
| Load | k6 | 5 cenários | `cd load-tests && ./run.sh` |

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Express, TypeScript, Sequelize |
| Banco | MySQL 8.0 (Azure Flexible Server) |
| Auth | JWT + Refresh Token + Azure AD SSO |
| Infra | Azure App Service, Static Web Apps, Key Vault |
| CI/CD | GitHub Actions (blue/green deploy) |
| Monitoring | Azure Application Insights |
| PWA | Service Worker (offline-first) |
| Security | HMAC, SHA-256, bcrypt, RBAC hierárquico, rate limiting |

---

## Segurança

- **Autenticação dual:** JWT local + Azure AD SSO (PKCE)
- **RBAC hierárquico:** 5 níveis (operador → administrador)
- **Audit trail:** Append-only com hash chain SHA-256
- **Anti-tampering:** HMAC de sessão, fingerprint, console protection
- **LGPD compliant:** API de direitos do titular + aviso de privacidade
- **Error boundaries:** Crash em módulo não derruba sistema

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagramas C4, ADRs, NFRs |
| [MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) | Manual do usuário final |
| [RUNBOOK.md](docs/RUNBOOK.md) | Operações TI (incidentes, backup, manutenção) |
| [MONITORING.md](docs/MONITORING.md) | App Insights + KQL + alertas |
| [LGPD_COMPLIANCE.md](docs/LGPD_COMPLIANCE.md) | Conformidade LGPD |
| [AZURE_AD_SETUP.md](docs/AZURE_AD_SETUP.md) | SSO com Entra ID |
| [KEYVAULT_SETUP.md](docs/KEYVAULT_SETUP.md) | Gerenciamento de secrets |
| [WCAG_CHECKLIST.md](docs/WCAG_CHECKLIST.md) | Acessibilidade WCAG 2.1 AA |

---

## Deploy

```bash
# Azure (via IaC)
az deployment sub create --template-file infra/bicep/main.bicep \
  --parameters @infra/bicep/parameters/production.json \
  dbAdminPassword=<SECRET> jwtSecret=$(openssl rand -base64 64)

# GitHub Actions (automático)
# Push para main → staging auto-deploy → smoke test → swap para production
```

---

## Licença

Proprietary — Vale S.A. Uso interno.
